import { useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { BATCH_CHECKLIST, BATCH_FIELDS, LIMITS, POINTS } from '../../shared/points.js';

const EMPTY = Object.fromEntries(BATCH_FIELDS.map((f) => [f.id, 0]));

export default function LogBatch() {
  const { stats, refresh } = useAuth();
  const [counts, setCounts] = useState(EMPTY);
  const [checked, setChecked] = useState([]);
  const [note, setNote] = useState('');
  const [state, setState] = useState(null);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const allChecked = checked.length === BATCH_CHECKLIST.length;

  const setCount = (id, v) => setCounts((c) => ({ ...c, [id]: Math.max(0, Math.min(500, Number(v) || 0)) }));
  const toggle = (id) => setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const submit = async (e) => {
    e.preventDefault();
    setState({ saving: true });
    try {
      const r = await api('/batches', { method: 'POST', body: { counts, checklist: checked, note } });
      setState({ points: r.points });
      setCounts(EMPTY);
      setChecked([]);
      setNote('');
      refresh();
    } catch (err) {
      setState({ error: err.message });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-5xl">Log a batch</h1>
        <p className="mt-2 text-lg">
          Sorted your household's recycling before pickup? Log it for {POINTS.BATCH} points, or{' '}
          {POINTS.BATCH + POINTS.BATCH_CHECKLIST_BONUS} if you did every step on the checklist. Up to{' '}
          {LIMITS.BATCHES_PER_DAY} a day{stats && ` (${stats.batchesRemainingToday} left today)`}.
        </p>
      </div>

      {state?.points !== undefined && (
        <p className="border-2 border-ink bg-bin p-4 font-display text-3xl font-extrabold uppercase text-white">
          Logged. +{state.points} points
        </p>
      )}

      <form onSubmit={submit} className="space-y-6">
        <div className="panel">
          <h2 className="border-b-2 border-ink px-4 py-3 text-2xl">What did you sort?</h2>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            {BATCH_FIELDS.map((f) => (
              <div key={f.id}>
                <label className="label" htmlFor={f.id}>{f.label}</label>
                <div className="flex">
                  <button type="button" className="btn-secondary !px-4" onClick={() => setCount(f.id, counts[f.id] - 1)} aria-label={`Fewer ${f.label}`}>-</button>
                  <input id={f.id} type="number" min="0" max="500" className="input -mx-0.5 text-center" value={counts[f.id]} onChange={(e) => setCount(f.id, e.target.value)} />
                  <button type="button" className="btn-secondary !px-4" onClick={() => setCount(f.id, counts[f.id] + 1)} aria-label={`More ${f.label}`}>+</button>
                </div>
              </div>
            ))}
          </div>
          <p className="border-t-2 border-ink px-4 py-2 text-sm">{total} items. You need at least 3.</p>
        </div>

        <div className="panel">
          <h2 className="border-b-2 border-ink px-4 py-3 text-2xl">Checklist</h2>
          <p className="px-4 pt-3 text-sm text-ash">The first one is required.</p>
          <ul className="p-2">
            {BATCH_CHECKLIST.map((c) => (
              <li key={c.id}>
                <label className="flex cursor-pointer items-start gap-3 p-2 hover:bg-paper">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-5 w-5 rounded-none border-2 border-ink text-ink focus:ring-0"
                    checked={checked.includes(c.id)}
                    onChange={() => toggle(c.id)}
                  />
                  <span>
                    {c.label}
                    {c.id === 'no-bags' && <span className="ml-1 font-bold text-stop">(required)</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label className="label" htmlFor="note">Note (optional)</label>
          <input id="note" className="input" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Took old batteries to Shady Grove" />
        </div>

        {state?.error && <p className="text-stop">{state.error}</p>}
        <button className="btn-primary" disabled={total < 3 || !checked.includes('no-bags') || state?.saving}>
          Log it, +{POINTS.BATCH + (allChecked ? POINTS.BATCH_CHECKLIST_BONUS : 0)}
        </button>
      </form>
    </div>
  );
}
