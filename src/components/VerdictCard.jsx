import { SHADY_GROVE } from '../../shared/rules.js';
import { streamStyle } from '../lib/streamStyles.js';
import StreamBadge from './StreamBadge.jsx';

export function AlertBanner({ children }) {
  return (
    <div role="alert" className="flex gap-3 rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-red-900">
      <span className="text-2xl" aria-hidden>🚫</span>
      <p className="font-semibold leading-snug">{children}</p>
    </div>
  );
}

export default function VerdictCard({ verdict }) {
  if (!verdict) return null;
  const { item, stream, alternateStream, alert, steps, reminder, split, contaminated } = verdict;
  const s = streamStyle(stream);
  const toShadyGrove = stream.id.startsWith('SHADY_GROVE');

  return (
    <div className="space-y-4">
      {alert && <AlertBanner>{alert}</AlertBanner>}

      <div className={`rounded-2xl p-5 ring-1 ${s.bg} ${s.ring}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.name}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-4xl" aria-hidden>{split ? '✂️' : stream.icon}</span>
          <div>
            <p className={`text-2xl font-extrabold ${s.text}`}>
              {split ? `Split it: clean part → ${stream.label}, greasy part → Trash` : stream.label}
            </p>
            <p className="text-sm text-slate-600">{stream.sublabel}</p>
          </div>
        </div>
        {contaminated && !split && (
          <p className="mt-3 inline-block rounded-lg bg-white/70 px-2 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
            ⚠️ Contamination detected
          </p>
        )}
        <p className="mt-3 text-sm text-slate-700">{stream.description}</p>
        {alternateStream && (
          <p className="mt-2 text-sm text-slate-600">
            Alternative: <StreamBadge stream={alternateStream} size="sm" />
          </p>
        )}
      </div>

      {reminder && (
        <div className="flex gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900 ring-1 ring-blue-200">
          <span aria-hidden className="text-xl">💧</span>
          <p className="font-medium">{reminder}</p>
        </div>
      )}

      <div className="card p-5">
        <h3 className="font-bold">How to sort it</h3>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {item.tip && <p className="mt-3 rounded-lg bg-eco-50 p-3 text-sm text-eco-900">💡 {item.tip}</p>}
      </div>

      {toShadyGrove && (
        <div className="card p-5 text-sm">
          <h3 className="font-bold">📍 {SHADY_GROVE.name}</h3>
          <p className="mt-1 text-slate-600">{SHADY_GROVE.address}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a className="btn-secondary" href={SHADY_GROVE.mapsUrl} target="_blank" rel="noreferrer">Directions</a>
            <a className="btn-secondary" href={SHADY_GROVE.infoUrl} target="_blank" rel="noreferrer">Hours & accepted items</a>
          </div>
        </div>
      )}
    </div>
  );
}
