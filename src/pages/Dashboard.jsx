import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

const TYPE_LABEL = { scan: 'Scan', quiz: 'Quiz', batch: 'Batch', bincheck: 'Bin' };

function describe(e) {
  if (e.type === 'scan') return `${e.meta.itemName}${e.meta.contaminationFound ? ', problem caught' : ''}`;
  if (e.type === 'quiz') return `Weekly quiz, ${e.meta.correct} of ${e.meta.total} right`;
  if (e.type === 'batch') return `Household batch, ${e.meta.totalItems} items`;
  if (e.type === 'bincheck') {
    return e.meta.verdict === 'ready'
      ? `Bin night check, ready${e.meta.fixed ? ' after fixing' : ''}, ${e.meta.streak}-week streak`
      : `Bin night check, ${e.meta.problems.length} to fix`;
  }
  return e.type;
}

function Stat({ label, value, sub }) {
  return (
    <div className="bg-white p-4">
      <p className="font-display text-sm font-bold uppercase tracking-wider text-ash">{label}</p>
      <p className="mt-1 font-display text-5xl font-extrabold leading-none">{value}</p>
      {sub && <p className="mt-1 text-sm text-ash">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    refresh().then(setData);
  }, [refresh]);

  if (!data) return <p className="text-ash">Loading...</p>;
  const { stats, recent } = data;

  return (
    <div className="space-y-8">
      <h1 className="text-5xl">{user.displayName}</h1>

      <div className="grid gap-[2px] border-2 border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Season points" value={stats.competitionPoints} sub={`${stats.allTime} all time`} />
        <Stat label="Rank" value={stats.rank ? stats.rank : '-'} sub={stats.rank ? `of ${stats.rankedStudents}` : 'Earn a point to get ranked'} />
        <Stat label="Items scanned" value={stats.scansCount} sub={`${stats.contaminationCaught} problems caught`} />
        <Stat label="Bin night streak" value={stats.binStreak} sub={stats.binCheckedThisPickup ? 'This week is done' : 'Weeks in a row'} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {[
          ['/bin-night', 'Bin night', data.pickup ? `Next pickup ${data.pickup.label}.` : 'Set your pickup day.'],
          ['/scan', 'Scan an item', 'Points for every item, more for catching problems.'],
          ['/quiz', 'Weekly quiz', stats.quizTakenThisWeek ? 'Done this week.' : 'Open now. Up to 60 points.'],
          ['/log', 'Log a batch', `${stats.batchesRemainingToday} left today.`],
        ].map(([to, title, sub]) => (
          <Link key={to} to={to} className="panel block p-4 hover:bg-paper">
            <p className="font-display text-2xl font-bold uppercase">{title}</p>
            <p className="mt-1 text-sm">{sub}</p>
          </Link>
        ))}
      </div>

      <div className="panel">
        <h2 className="border-b-2 border-ink px-4 py-3 text-2xl">Recent</h2>
        {recent.length === 0 ? (
          <p className="p-4 text-ash">Nothing yet. Scan something to get started.</p>
        ) : (
          <ul className="divide-y divide-ink/15">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="tag w-14 bg-ink text-center text-white">{TYPE_LABEL[e.type]}</span>
                <span className="flex-1">{describe(e)}</span>
                <span className="hidden text-ash sm:inline">{new Date(e.createdAt).toLocaleDateString()}</span>
                <span className="w-10 text-right font-display text-lg font-bold">+{e.points}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
