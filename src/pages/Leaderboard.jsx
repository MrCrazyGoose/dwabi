import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
}

function daysLeft(end) {
  return Math.max(0, Math.ceil((new Date(end) - Date.now()) / 86400000));
}

export default function Leaderboard() {
  const { user, stats } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/leaderboard').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-stop">{error}</p>;
  if (!data) return <p className="text-ash">Loading...</p>;

  const { competition, players } = data;
  const meListed = user && players.some((p) => p.id === user.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-5xl">{competition.name}</h1>
          <p className="mt-2 text-lg">
            {formatDate(competition.start)} to {formatDate(competition.end)}
          </p>
        </div>
        <p className="border-2 border-ink bg-hazard px-4 py-2 font-display text-2xl font-extrabold uppercase">
          {daysLeft(competition.end)} days left
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="panel self-start">
          {players.length === 0 ? (
            <p className="p-8 text-center text-ash">Nobody has points yet this season.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-ink bg-ink text-left font-display uppercase tracking-wide text-white">
                  <th className="w-16 px-4 py-2">Rank</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/15">
                {players.map((p) => {
                  const mine = p.id === user?.id;
                  return (
                    <tr key={p.id} className={mine ? 'bg-hazard/40' : p.rank <= 3 ? 'bg-paper' : ''}>
                      <td className="px-4 py-2.5 font-stencil text-3xl font-extrabold">{p.rank}</td>
                      <td className="px-4 py-2.5 font-medium">
                        {p.displayName}
                        {mine && <span className="tag ml-2 bg-ink text-white">You</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-display text-xl font-bold tabular-nums">{p.points.toLocaleString()}</td>
                    </tr>
                  );
                })}
                {user && !meListed && stats?.rank && (
                  <tr className="border-t-2 border-ink bg-hazard/40">
                    <td className="px-4 py-2.5 font-display text-2xl font-bold">{stats.rank}</td>
                    <td className="px-4 py-2.5 font-medium">
                      {user.displayName} <span className="tag ml-2 bg-ink text-white">You</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-display text-xl font-bold tabular-nums">{stats.competitionPoints}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {!user && (
            <p className="border-t-2 border-ink px-4 py-3">
              <Link to="/register" className="font-semibold underline">Sign up</Link> to get on the board.
            </p>
          )}
        </div>

        <aside className="space-y-6">
          <div className="panel">
            <h2 className="border-b-2 border-ink px-4 py-3 text-2xl">Prizes</h2>
            <ul className="divide-y divide-ink/15">
              {competition.prizes.map((p) => (
                <li key={p.place} className="px-4 py-3">
                  <p className="font-display text-lg font-bold uppercase">{p.place}</p>
                  <p className="text-sm">{p.prize}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="panel">
            <h2 className="border-b-2 border-ink px-4 py-3 text-2xl">Rules</h2>
            <ul className="list-disc space-y-1.5 px-4 py-3 pl-8 text-sm">
              {competition.rules.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
