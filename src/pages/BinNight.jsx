import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useConfig } from '../lib/config.js';
import { loadImageFile, toCanvas, toJpegDataUrl } from '../lib/vision.js';
import { WEEKDAYS, PICKUP_DAYS } from '../../shared/pickup.js';
import { POINTS } from '../../shared/points.js';

const COUNTY_LOOKUP = 'https://www2.montgomerycountymd.gov/DEPcollectionday/collectionday.aspx';

const PROBLEM_LABEL = {
  plastic_bag: 'Plastic bag',
  bagged_recyclables: 'Bagged recyclables',
  plastic_film: 'Plastic film',
  food_or_liquid: 'Food or liquid',
  greasy_paper: 'Greasy paper',
  foam: 'Foam',
  tangler: 'Tangler',
  battery_or_electronics: 'Battery or electronics',
  hazardous: 'Hazardous',
  wrong_bin: 'Wrong bin',
  not_recyclable: 'Not recyclable',
  other: 'Other',
};

function PickupDayPicker({ day, onChange, saving }) {
  return (
    <div className="panel">
      <h2 className="border-b-2 border-ink px-4 py-3 text-2xl">Your pickup day</h2>
      <div className="p-4">
        <div className="flex flex-wrap">
          {PICKUP_DAYS.map((d) => (
            <button
              key={d}
              disabled={saving}
              onClick={() => onChange(d)}
              className={`-ml-0.5 border-2 border-ink px-3 py-1.5 font-display text-lg font-bold uppercase first:ml-0 ${
                day === d ? 'bg-ink text-white' : 'bg-white hover:bg-paper'
              }`}
            >
              {WEEKDAYS[d].slice(0, 3)}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm">
          Not sure?{' '}
          <a className="font-semibold underline" href={COUNTY_LOOKUP} target="_blank" rel="noreferrer">
            Look up your day on the county site
          </a>
          . If your town runs its own pickup (Rockville, Gaithersburg or Takoma Park, for example), use the day your town
          gives you.
        </p>
      </div>
    </div>
  );
}

function ResultSign({ result }) {
  if (result.verdict === 'ready') {
    return (
      <div className="border-2 border-ink bg-leaf p-5 text-white">
        <p className="font-display text-sm font-bold uppercase tracking-wider opacity-80">Bin check</p>
        <p className="font-stencil text-6xl font-extrabold uppercase leading-[0.9]">Ready to go out</p>
      </div>
    );
  }
  if (result.verdict === 'fix_first') {
    return (
      <div className="border-2 border-ink bg-white">
        <div className="stripe h-3" />
        <div className="p-5">
          <p className="font-display text-sm font-bold uppercase tracking-wider text-ash">Bin check</p>
          <p className="font-stencil text-6xl font-extrabold uppercase leading-[0.9]">Fix first</p>
          <p className="mt-2">
            {result.problems.length === 1 ? 'One thing needs' : `${result.problems.length} things need`} to come out before
            this goes to the curb.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="border-2 border-ink bg-white p-5">
      <p className="font-stencil text-6xl font-extrabold uppercase leading-[0.9]">Can't tell</p>
      <p className="mt-2">Open the lid all the way and take the photo from above, with good light.</p>
    </div>
  );
}

export default function BinNight() {
  const { user, refresh } = useAuth();
  const config = useConfig();
  const [me, setMe] = useState(null);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [check, setCheck] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (user) refresh().then(setMe);
  }, [user?.id, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const day = me?.user?.pickupDay ?? null;
  const pickup = me?.pickup;
  const stats = me?.stats;

  const setDay = async (d) => {
    setSaving(true);
    try {
      await api('/me/pickup', { method: 'PUT', body: { day: d } });
      setMe(await refresh());
    } finally {
      setSaving(false);
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setCheck(null);
    setBusy(true);
    try {
      const canvas = toCanvas(await loadImageFile(file), 1600);
      const image = toJpegDataUrl(canvas);
      setPhoto(image);
      const out = await api('/bin-checks', { method: 'POST', body: { image } });
      setCheck(out);
      setMe(await refresh());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-5xl">Bin night</h1>
        <p className="text-lg">
          The night before pickup, open your bin and take a photo. You get a list of anything that has to come out before
          it goes to the curb, and points for a clean bin every week.
        </p>
        <p>
          <Link to="/register" className="btn-primary">Sign up to start</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-5xl">Bin night</h1>
        <p className="mt-2 max-w-2xl text-lg">
          The night before pickup, open your recycling bin and take a photo. Anything that has to come out gets listed, with
          what to do with it.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {me && <PickupDayPicker day={day} onChange={setDay} saving={saving} />}

          {pickup && (
            <div className="panel">
              <div className="bg-bin p-5 text-white">
                <p className="font-display text-sm font-bold uppercase tracking-wider opacity-80">Next pickup</p>
                <p className="font-stencil text-5xl font-extrabold uppercase leading-[0.9]">{pickup.label}</p>
                <p className="mt-2">Set your bins out by 7 a.m.</p>
              </div>
              {pickup.holiday && (
                <p className="border-t-2 border-ink bg-hazard px-4 py-2 font-medium">
                  Moved a day later this week for {pickup.holiday}.
                </p>
              )}
              <div className="space-y-3 border-t-2 border-ink p-4">
                <p>
                  Checks count from <strong>noon the day before</strong> until <strong>10 a.m. pickup day</strong>. A clean
                  bin earns {POINTS.BIN_CHECK} points, plus a streak bonus for every week in a row.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <a className="btn-secondary" href={`/api/pickup/calendar.ics?day=${day}`}>Add reminders to my calendar</a>
                  {stats && (
                    <span className="font-display text-xl font-bold uppercase">
                      Streak: {stats.binStreak} {stats.binStreak === 1 ? 'week' : 'weeks'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {config && !config.photoChecks ? (
            <div className="panel p-5">
              <h2 className="text-2xl">Bin checks are off</h2>
              <p className="mt-2">This server does not have the AI photo checker set up yet, so bin checks are not available.</p>
            </div>
          ) : (
            <div className="panel">
              <h2 className="border-b-2 border-ink px-4 py-3 text-2xl">Check your bin</h2>
              <div className="space-y-3 p-4">
                <p>Open the lid all the way and take the photo from above, so the whole inside is in the picture.</p>
                <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={busy}>
                  {busy ? 'Checking...' : check ? 'Check again' : 'Take a photo'}
                </button>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
                <p className="text-sm text-ash">
                  Your photo is sent to an AI service to be checked and is not saved by this site. Keep people out of the shot.
                </p>
                {error && <p className="font-medium text-stop">{error}</p>}
              </div>
            </div>
          )}

          {photo && (busy || check) && (
            <img src={photo} alt="Your bin" className="max-h-80 w-full border-2 border-ink bg-ink object-contain" />
          )}

          {check && (
            <div className="space-y-4">
              <ResultSign result={check.result} />

              {check.result.problems.length > 0 && (
                <ol className="panel divide-y divide-ink/15">
                  {check.result.problems.map((p, i) => (
                    <li key={`${p.kind}-${i}`} className="p-4">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="tag bg-stop text-white">{PROBLEM_LABEL[p.kind]}</span>
                        <span className="font-semibold">{p.what}</span>
                      </p>
                      <p className="mt-1 text-sm text-ash">Where: {p.where}</p>
                      <p className="mt-1">{p.fix}</p>
                    </li>
                  ))}
                </ol>
              )}

              {check.result.looks_good.length > 0 && (
                <div className="panel p-4">
                  <p className="font-display text-lg font-bold uppercase">Done right</p>
                  <ul className="mt-1 list-disc pl-5">
                    {check.result.looks_good.map((g) => <li key={g}>{g}</li>)}
                  </ul>
                </div>
              )}

              {check.counted ? (
                <p className="border-2 border-ink bg-bin p-4 font-display text-3xl font-extrabold uppercase text-white">
                  +{check.points} points. Streak: {check.streak}
                </p>
              ) : (
                check.note && <p className="border-2 border-ink bg-white p-4 font-medium">{check.note}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
