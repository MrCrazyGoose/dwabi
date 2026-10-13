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
        <h1 className="text-3xl font-extrabold tracking-tight">Log a sorted household batch</h1>
        <p className="mt-1 text-slate-600">
          Sorted your family's recycling before pickup day? Log it for +{POINTS.BATCH} points, or +
          {POINTS.BATCH + POINTS.BATCH_CHECKLIST_BONUS} when every prep step is done. Up to {LIMITS.BATCHES_PER_DAY} batches per day
          {stats && ` (${stats.batchesRemainingToday} left today)`}.
        </p>
      </div>

      {state?.points !== undefined && (
        <div className="rounded-2xl bg-eco-600 p-5 text-white">
          <p className="text-2xl font-extrabold">🎉 +{state.points} points!</p>
          <p className="text-eco-100">Thanks for keeping Montgomery County's recycling clean.</p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">
        <div className="card p-5">
          <h2 className="font-bold">How many items did you sort?</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {BATCH_FIELDS.map((f) => (
              <div key={f.id}>
                <label className="label" htmlFor={f.id}>{f.label}</label>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn-secondary !px-3" onClick={() => setCount(f.id, counts[f.id] - 1)} aria-label={`Fewer ${f.label}`}>−</button>
                  <input id={f.id} type="number" min="0" max="500" className="input text-center" value={counts[f.id]} onChange={(e) => setCount(f.id, e.target.value)} />
                  <button type="button" className="btn-secondary !px-3" onClick={() => setCount(f.id, counts[f.id] + 1)} aria-label={`More ${f.label}`}>+</button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-500">{total} items total (minimum 3)</p>
        </div>

        <div className="card p-5">
          <h2 className="font-bold">Prep checklist</h2>
          <p className="text-sm text-slate-500">The first item is required. Check them all for a +{POINTS.BATCH_CHECKLIST_BONUS} bonus.</p>
          <ul className="mt-3 space-y-2">
            {BATCH_CHECKLIST.map((c) => (
              <li key={c.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-slate-50">
                  <input type="checkbox" className="mt-0.5 h-5 w-5 rounded border-slate-300 text-eco-600 focus:ring-eco-500" checked={checked.includes(c.id)} onChange={() => toggle(c.id)} />
                  <span className="text-sm">{c.label}{c.id === 'no-bags' && <span className="ml-1 text-red-600">*</span>}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <label className="label" htmlFor="note">Note (optional)</label>
          <input id="note" className="input" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Took old batteries to Shady Grove" />
        </div>

        {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
        <button className="btn-primary" disabled={total < 3 || !checked.includes('no-bags') || state?.saving}>
          Log batch · +{POINTS.BATCH + (allChecked ? POINTS.BATCH_CHECKLIST_BONUS : 0)} pts
        </button>
      </form>
    </div>
  );
}
