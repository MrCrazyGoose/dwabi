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

function Verdict({ result }) {
  if (result.verdict === 'ready') {
    return (
      <div className="rounded-3xl bg-brand-400 p-6 text-center">
        <p className="font-heading text-4xl font-bold">Ready to roll!</p>
        <p className="mt-1">Your bin is good to go out.</p>
      </div>
    );
  }
  if (result.verdict === 'fix_first') {
    return (
      <div className="overflow-hidden rounded-3xl border-2 border-ink bg-white">
        <div className="stripe h-3" />
        <div className="p-5 text-center">
          <p className="font-heading text-4xl font-bold">Fix first</p>
          <p className="mt-1">
            {result.problems.length === 1 ? '1 thing needs' : `${result.problems.length} things need`} to come out.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="card p-5 text-center">
      <p className="font-heading text-3xl font-bold">Can't tell</p>
      <p className="mt-1">Open the lid all the way and take the photo from above, with good light.</p>
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
      const image = toJpegDataUrl(toCanvas(await loadImageFile(file), 1600));
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
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <h1 className="text-4xl">Bin night</h1>
        <p className="text-lg">
          The night before trash day, snap a photo of your recycling bin. We'll tell you what has to come out, and a clean bin
          earns {POINTS.BIN_CHECK} points.
        </p>
        <Link to="/register" className="btn-primary btn-big">Join to start</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-4xl">Bin night</h1>
        <p className="mt-1">
          The night before pickup, snap your open recycling bin. A clean bin earns {POINTS.BIN_CHECK} points, and more for every
          week in a row.
        </p>
      </div>

      {me && (
        <div className="card p-5">
          <p className="font-heading text-xl font-semibold">When is your trash day?</p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {PICKUP_DAYS.map((d) => (
              <button
                key={d}
                disabled={saving}
                onClick={() => setDay(d)}
                className={`rounded-full py-2 font-heading font-semibold ${day === d ? 'bg-brand-700 text-white' : 'bg-brand-50 text-brand-800'}`}
              >
                {WEEKDAYS[d].slice(0, 3)}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm">
            Not sure? Ask a parent or{' '}
            <a className="font-semibold text-brand-700 underline" href={COUNTY_LOOKUP} target="_blank" rel="noreferrer">
              look it up on the county site
            </a>
            .
          </p>
        </div>
      )}

      {pickup && (
        <div className="card overflow-hidden">
          <div className="bg-brand-400 p-5">
            <p className="text-sm font-bold">Next pickup</p>
            <p className="font-heading text-3xl font-bold">{pickup.label}</p>
            {pickup.holiday && <p className="mt-1 text-sm font-semibold">Moved a day later for {pickup.holiday}.</p>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="font-heading text-2xl font-bold">{stats?.binStreak || 0}-week streak</p>
              <p className="text-sm text-ash">Check between noon the day before and 10 a.m. pickup day.</p>
            </div>
            <a className="btn-secondary !px-4 !py-1.5 !text-base" href={`/api/pickup/calendar.ics?day=${day}`}>Remind me</a>
          </div>
        </div>
      )}

      {config && !config.photoChecks ? (
        <div className="card p-5 text-center text-ash">Bin checks are not turned on for this site yet.</div>
      ) : (
        <div className="text-center">
          <button className="btn-primary btn-big w-full" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? 'Checking your bin...' : check ? 'Check again' : 'Snap my bin'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
          <p className="mt-2 text-xs text-ash">Lid all the way open, photo from above. Keep people out of the shot.</p>
          {error && <p className="mt-2 font-semibold text-stop">{error}</p>}
        </div>
      )}

      {photo && (busy || check) && <img src={photo} alt="Your bin" className="max-h-72 w-full rounded-3xl bg-ink object-contain" />}

      {check && (
        <div className="space-y-4">
          <Verdict result={check.result} />

          {check.result.problems.length > 0 && (
            <ol className="space-y-3">
              {check.result.problems.map((p, i) => (
                <li key={`${p.kind}-${i}`} className="card p-4">
                  <span className="pill bg-stop text-white">{PROBLEM_LABEL[p.kind]}</span>
                  <p className="mt-2 font-semibold">{p.what}</p>
                  <p className="text-sm text-ash">Where: {p.where}</p>
                  <p className="mt-1">{p.fix}</p>
                </li>
              ))}
            </ol>
          )}

          {check.result.looks_good.length > 0 && (
            <div className="card p-4">
              <p className="font-heading text-lg font-semibold">Nice work on</p>
              <ul className="mt-1 list-disc pl-5">
                {check.result.looks_good.map((g) => <li key={g}>{g}</li>)}
              </ul>
            </div>
          )}

          {check.counted ? (
            <div className="rounded-3xl bg-brand-400 p-5 text-center">
              <p className="font-heading text-4xl font-bold">+{check.points} points</p>
              <p className="font-heading text-lg font-semibold">{check.streak}-week streak</p>
            </div>
          ) : (
            check.note && <p className="card p-4 text-center font-semibold">{check.note}</p>
          )}
        </div>
      )}
    </div>
  );
}
