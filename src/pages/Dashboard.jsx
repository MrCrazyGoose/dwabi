import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

const TYPE_LABEL = { scan: 'Scan', quiz: 'Quiz', batch: 'Batch' };

function describe(e) {
  if (e.type === 'scan') return `${e.meta.itemName}${e.meta.contaminationFound ? ' · contamination caught' : ''}`;
  if (e.type === 'quiz') return `Weekly quiz: ${e.meta.correct}/${e.meta.total} correct`;
  if (e.type === 'batch') return `Household batch: ${e.meta.totalItems} items sorted`;
  return e.type;
}

function Stat({ label, value, sub }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-eco-700">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    refresh().then(setData);
  }, [refresh]);

  if (!data) return <p className="text-slate-500">Loading…</p>;
  const { stats, recent } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Hi, {user.displayName} 👋</h1>
        <p className="mt-1 text-slate-600">
          Competing for <strong>{user.school?.name}</strong> · {user.school?.cluster}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Season points" value={stats.competitionPoints} sub={`${stats.allTime} all-time`} />
        <Stat label="Your rank" value={stats.rank ? `#${stats.rank}` : '—'} sub={stats.rank ? `of ${stats.rankedStudents} students` : 'Earn points to get ranked'} />
        <Stat label="Items scanned" value={stats.scansCount} sub={`${stats.contaminationCaught} contamination catches`} />
        <Stat label="Today" value={`${stats.scanPointsRemainingToday}`} sub="scan points still available" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/scan" className="card group p-5 transition hover:ring-eco-400">
          <p className="text-3xl">📷</p>
          <p className="mt-2 font-bold group-hover:text-eco-700">Scan an item</p>
          <p className="text-sm text-slate-500">Earn points and catch contamination.</p>
        </Link>
        <Link to="/quiz" className="card group p-5 transition hover:ring-eco-400">
          <p className="text-3xl">🧠</p>
          <p className="mt-2 font-bold group-hover:text-eco-700">Weekly quiz</p>
          <p className="text-sm text-slate-500">{stats.quizTakenThisWeek ? 'Done this week ✓' : 'Available now — up to 60 pts'}</p>
        </Link>
        <Link to="/log" className="card group p-5 transition hover:ring-eco-400">
          <p className="text-3xl">🧺</p>
          <p className="mt-2 font-bold group-hover:text-eco-700">Log a household batch</p>
          <p className="text-sm text-slate-500">{stats.batchesRemainingToday} left today</p>
        </Link>
      </div>

      <div className="card">
        <h2 className="border-b border-slate-100 px-5 py-4 font-bold">Recent activity</h2>
        {recent.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No activity yet. Scan your first item!</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span className="w-14 rounded-full bg-slate-100 px-2 py-0.5 text-center text-xs font-semibold text-slate-600">{TYPE_LABEL[e.type]}</span>
                <span className="flex-1">{describe(e)}</span>
                <span className="text-xs text-slate-400">{new Date(e.createdAt).toLocaleDateString()}</span>
                <span className="w-12 text-right font-bold text-eco-700">+{e.points}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
