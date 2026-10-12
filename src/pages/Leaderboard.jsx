import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

const TABS = [
  { id: 'students', label: 'Students' },
  { id: 'schools', label: 'Schools' },
  { id: 'clusters', label: 'Clusters' },
];

const MEDALS = ['🥇', '🥈', '🥉'];

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
}

function daysLeft(end) {
  return Math.max(0, Math.ceil((new Date(end) - Date.now()) / 86400000));
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('students');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/leaderboard').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-700">{error}</p>;
  if (!data) return <p className="text-slate-500">Loading leaderboard…</p>;

  const { competition } = data;
  const rows = data[tab];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{competition.name}</h1>
          <p className="mt-1 text-slate-600">
            {formatDate(competition.start)} – {formatDate(competition.end)} ·{' '}
            <strong>{daysLeft(competition.end)} days left</strong>
          </p>
        </div>
        <div className="inline-flex rounded-xl bg-slate-200/70 p-1 text-sm font-semibold" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-1.5 ${tab === t.id ? 'bg-white shadow-sm' : 'text-slate-600'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="card overflow-hidden">
          {rows.length === 0 ? (
            <p className="p-8 text-center text-slate-500">No points yet this season. Be the first on the board!</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-14 px-4 py-3">#</th>
                  <th className="px-4 py-3">{tab === 'students' ? 'Student' : tab === 'schools' ? 'School' : 'Cluster'}</th>
                  {tab !== 'students' && <th className="px-4 py-3 text-right">Active</th>}
                  {tab !== 'students' && <th className="px-4 py-3 text-right">Pts / student</th>}
                  <th className="px-4 py-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => {
                  const mine = tab === 'students' ? r.id === user?.id : tab === 'schools' ? r.id === user?.school?.id : r.name === user?.school?.cluster;
                  return (
                    <tr key={r.id || r.name} className={mine ? 'bg-eco-50' : ''}>
                      <td className="px-4 py-3 font-bold text-slate-500">{MEDALS[i] || i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{r.displayName || r.name}{mine && <span className="ml-2 text-xs text-eco-700">(you)</span>}</p>
                        {tab === 'students' && <p className="text-xs text-slate-500">{r.school}</p>}
                        {tab === 'schools' && <p className="text-xs text-slate-500">{r.cluster}</p>}
                        {tab === 'clusters' && <p className="text-xs text-slate-500">{r.schools} schools</p>}
                      </td>
                      {tab !== 'students' && <td className="px-4 py-3 text-right tabular-nums">{r.students}</td>}
                      {tab !== 'students' && <td className="px-4 py-3 text-right font-semibold tabular-nums">{r.perStudent}</td>}
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-eco-700">{r.points.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {tab === 'schools' && rows.length > 0 && (
            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">Schools are ranked by points per active student so every school can compete.</p>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="text-lg font-bold">🎁 Prizes</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {competition.prizes.map((p) => (
                <li key={p.place}>
                  <p className="font-semibold text-eco-800">{p.place}</p>
                  <p className="text-slate-600">{p.prize}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-5">
            <h2 className="text-lg font-bold">Rules</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {competition.rules.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
