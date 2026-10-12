import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { POINTS } from '../../shared/points.js';
import { AlertBanner } from '../components/VerdictCard.jsx';

const FEATURES = [
  {
    icon: '🔍',
    title: 'Contamination detection',
    body: 'Not just “cardboard” — EcoSort checks for grease stains, food residue and banned items like plastic bags, right on your device.',
  },
  {
    icon: '🏆',
    title: 'School leaderboard',
    body: 'Earn points for your school or neighborhood cluster. Top students and schools win eco gear, SSL recognition and green-team grants.',
  },
  {
    icon: '📍',
    title: 'Montgomery County rules',
    body: 'Blue bin, mixed-paper cart, or the Shady Grove Transfer Station? Answers follow county DEP rules — not generic advice.',
  },
];

export default function Home() {
  const { user } = useAuth();
  const [board, setBoard] = useState(null);

  useEffect(() => {
    api('/leaderboard').then(setBoard).catch(() => {});
  }, []);

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-eco-700 via-eco-600 to-emerald-500 px-6 py-12 text-white sm:px-12 sm:py-16">
        <div className="relative z-10 max-w-2xl">
          <p className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            Montgomery County, MD · Youth Zero-Waste Challenge
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">Scan it. Sort it right. Win for your school.</h1>
          <p className="mt-4 text-lg text-eco-50">
            “Wish-recycling” contaminates Montgomery County blue bins every day. EcoSort tells you exactly where each item
            goes — and catches the greasy pizza boxes and plastic bags before they reach the truck.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/scan" className="btn bg-white text-eco-800 hover:bg-eco-50">📷 Scan an item</Link>
            {!user && (
              <Link to="/register" className="btn bg-eco-900/40 text-white ring-1 ring-white/40 hover:bg-eco-900/60">
                Join with your school
              </Link>
            )}
            {user && (
              <Link to="/dashboard" className="btn bg-eco-900/40 text-white ring-1 ring-white/40 hover:bg-eco-900/60">
                My dashboard
              </Link>
            )}
          </div>
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 text-[16rem] leading-none opacity-10">♻</div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="card p-6">
            <p className="text-3xl">{f.icon}</p>
            <h2 className="mt-3 text-lg font-bold">{f.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">The #1 rule people get wrong</h2>
        <AlertBanner>
          Montgomery County does not accept plastic bags in curbside recycling! Please bring them to a local grocery store
          drop-off or place them in the trash — and never bag your recyclables.
        </AlertBanner>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-xl font-bold">How to earn points</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex justify-between gap-4"><span>Scan and sort an item</span><strong>+{POINTS.SCAN}</strong></li>
            <li className="flex justify-between gap-4"><span>Catch contamination or a banned item</span><strong>+{POINTS.CONTAMINATION_BONUS} bonus</strong></li>
            <li className="flex justify-between gap-4"><span>Weekly Zero-Waste Quiz (per correct answer)</span><strong>+{POINTS.QUIZ_PER_CORRECT}</strong></li>
            <li className="flex justify-between gap-4"><span>Perfect quiz score</span><strong>+{POINTS.QUIZ_PERFECT_BONUS} bonus</strong></li>
            <li className="flex justify-between gap-4"><span>Log a sorted household batch</span><strong>+{POINTS.BATCH}–{POINTS.BATCH + POINTS.BATCH_CHECKLIST_BONUS}</strong></li>
          </ul>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Top schools right now</h2>
            <Link to="/leaderboard" className="text-sm font-semibold text-eco-700">Full leaderboard →</Link>
          </div>
          {board?.schools?.length ? (
            <ol className="mt-4 space-y-2">
              {board.schools.slice(0, 5).map((s, i) => (
                <li key={s.id} className="flex items-center gap-3 text-sm">
                  <span className="w-6 text-center font-bold text-slate-400">{i + 1}</span>
                  <span className="flex-1 font-medium">{s.name}</span>
                  <span className="tabular-nums text-slate-600">{s.perStudent} pts/student</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No points yet this season — your school could be first!</p>
          )}
        </div>
      </section>
    </div>
  );
}
