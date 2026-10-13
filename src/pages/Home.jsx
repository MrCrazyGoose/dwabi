import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { POINTS } from '../../shared/points.js';
import { SHADY_GROVE } from '../../shared/rules.js';
import { WarningSign } from '../components/VerdictCard.jsx';

const BINS = [
  {
    name: 'Blue bin',
    cls: 'bg-bin text-white',
    yes: 'Bottles, cans, jars, cartons, plastic tubs and containers, clean foil.',
    rule: 'Empty. Rinsed. Loose.',
  },
  {
    name: 'Paper',
    cls: 'bg-kraft text-ink',
    yes: 'Cardboard, cereal boxes, mail, newspaper, the clean lid of a pizza box.',
    rule: 'Clean, dry, flattened.',
  },
  {
    name: 'Trash',
    cls: 'bg-ink text-white',
    yes: 'Foam, chip bags, used napkins, greasy paper, drinking glasses, plastic utensils.',
    rule: 'If unsure, it goes here.',
  },
  {
    name: 'Shady Grove',
    cls: 'bg-stop text-white',
    yes: 'Batteries, car batteries, electronics, paint, propane, fluorescent bulbs.',
    rule: SHADY_GROVE.address.replace(', MD 20855', ''),
  },
];

// A real result from the scanner, shown as an example.
function ExampleResult() {
  return (
    <div className="frame mx-2 my-2">
      <div className="panel">
        <div className="flex items-center justify-between border-b-2 border-ink px-4 py-2">
          <p className="font-display font-bold uppercase tracking-wide">Pizza box</p>
          <span className="tag bg-hazard">Grease found</span>
        </div>
        <div className="grid grid-cols-2">
          <div className="bg-kraft p-4">
            <p className="font-display text-xs font-bold uppercase tracking-wider opacity-80">Clean lid</p>
            <p className="font-stencil text-4xl font-extrabold uppercase leading-none">Paper</p>
          </div>
          <div className="bg-ink p-4 text-white">
            <p className="font-display text-xs font-bold uppercase tracking-wider opacity-80">Greasy bottom</p>
            <p className="font-stencil text-4xl font-extrabold uppercase leading-none">Trash</p>
          </div>
        </div>
        <p className="px-4 py-3 text-sm">Tear off the greasy part. A few grease spots can spoil a whole bale of paper.</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [board, setBoard] = useState(null);

  useEffect(() => {
    api('/leaderboard').then(setBoard).catch(() => {});
  }, []);

  return (
    <div className="space-y-14">
      <section className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center">
        <div>
          <p className="tag bg-ink text-white">Montgomery County, MD</p>
          <h1 className="mt-4 text-7xl sm:text-8xl">
            Scan it
            <br />
            <span className="text-bin">before</span> you
            <br />
            toss it.
          </h1>
          <p className="mt-5 max-w-xl text-lg">
            Point your phone at whatever you are about to throw out. You see which bin it goes in under county rules, and
            whether grease, leftover food or a plastic bag would spoil the load.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-5">
            <span className="frame">
              <Link to="/scan" className="btn-primary !px-6 !py-3 !text-xl">Scan something</Link>
            </span>
            <Link to="/guide" className="font-display text-lg font-bold uppercase underline">Or look it up</Link>
          </div>
        </div>
        <ExampleResult />
      </section>

      <section className="grid gap-[2px] border-2 border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
        {BINS.map((b) => (
          <div key={b.name} className={`p-5 ${b.cls}`}>
            <h2 className="font-stencil text-4xl font-extrabold">{b.name}</h2>
            <p className="mt-3 text-sm font-medium">{b.yes}</p>
            <p className="mt-4 font-display text-lg font-bold uppercase">{b.rule}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div>
          <p className="tag bg-hazard">Every week</p>
          <h2 className="mt-3 font-stencil text-5xl font-extrabold">Bin night</h2>
          <p className="mt-3 max-w-lg text-lg">
            The night before pickup, take one photo of your open recycling bin. Anything that has to come out gets listed,
            with what to do with it. Clean bins build a streak.
          </p>
          <Link to="/bin-night" className="btn-secondary mt-5">Set up bin night</Link>
        </div>
        <WarningSign title="The one most people get wrong">
          Montgomery County does not accept plastic bags in curbside recycling. Bring them to a grocery store drop-off or
          put them in the trash, and never bag your recyclables.
        </WarningSign>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel">
          <h2 className="border-b-2 border-ink px-5 py-3 text-2xl">Points</h2>
          <table className="w-full">
            <tbody className="divide-y divide-ink/15">
              {[
                ['Scan and sort an item', `+${POINTS.SCAN}`],
                ['Catch grease, food or a banned item', `+${POINTS.CONTAMINATION_BONUS} more`],
                ['Clean bin on bin night', `+${POINTS.BIN_CHECK}, plus streak`],
                ['Weekly quiz, per right answer', `+${POINTS.QUIZ_PER_CORRECT}`],
                ['Log a sorted batch from home', `+${POINTS.BATCH} to ${POINTS.BATCH + POINTS.BATCH_CHECKLIST_BONUS}`],
              ].map(([what, pts]) => (
                <tr key={what}>
                  <td className="px-5 py-2.5">{what}</td>
                  <td className="px-5 py-2.5 text-right font-display text-lg font-bold">{pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <div className="flex items-baseline justify-between border-b-2 border-ink px-5 py-3">
            <h2 className="text-2xl">Top right now</h2>
            <Link to="/leaderboard" className="font-display font-bold uppercase underline">Full board</Link>
          </div>
          {board?.players?.length ? (
            <ol className="divide-y divide-ink/15">
              {board.players.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center gap-4 px-5 py-2.5">
                  <span className="w-6 font-stencil text-2xl font-extrabold">{p.rank}</span>
                  <span className="flex-1 font-medium">{p.displayName}</span>
                  <span className="font-display text-lg font-bold tabular-nums">{p.points}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-5 py-4 text-ash">Nobody has points yet this season.</p>
          )}
        </div>
      </section>
    </div>
  );
}
