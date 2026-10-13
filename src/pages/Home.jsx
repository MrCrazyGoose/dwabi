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

export default function Home() {
  const [board, setBoard] = useState(null);

  useEffect(() => {
    api('/leaderboard').then(setBoard).catch(() => {});
  }, []);

  return (
    <div className="space-y-12">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <p className="tag bg-ink text-white">Montgomery County, MD</p>
          <h1 className="mt-4 text-6xl sm:text-7xl">Which bin does it go in?</h1>
          <p className="mt-4 max-w-xl text-lg">
            Point your phone at whatever you are about to throw out. You get the answer under county rules, and a warning
            when grease, leftover food or a plastic bag would ruin the load.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/scan" className="btn-primary">Scan an item</Link>
            <Link to="/guide" className="btn-secondary">Look something up</Link>
          </div>
        </div>
        <WarningSign title="The one most people get wrong">
          Montgomery County does not accept plastic bags in curbside recycling. Bring them to a grocery store drop-off or
          put them in the trash, and never bag your recyclables.
        </WarningSign>
      </section>

      <section className="grid gap-[2px] border-2 border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
        {BINS.map((b) => (
          <div key={b.name} className={`p-5 ${b.cls}`}>
            <h2 className="text-4xl">{b.name}</h2>
            <p className="mt-3 text-sm font-medium">{b.yes}</p>
            <p className="mt-4 font-display text-lg font-bold uppercase">{b.rule}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel">
          <h2 className="border-b-2 border-ink px-5 py-3 text-2xl">Points</h2>
          <table className="w-full">
            <tbody className="divide-y divide-ink/15">
              {[
                ['Scan and sort an item', `+${POINTS.SCAN}`],
                ['Catch grease, food or a banned item', `+${POINTS.CONTAMINATION_BONUS} more`],
                ['Weekly quiz, per right answer', `+${POINTS.QUIZ_PER_CORRECT}`],
                ['All five quiz answers right', `+${POINTS.QUIZ_PERFECT_BONUS} more`],
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
                  <span className="w-6 font-display text-xl font-bold">{p.rank}</span>
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
