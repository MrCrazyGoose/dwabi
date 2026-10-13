import { SHADY_GROVE, getStream } from '../../shared/rules.js';
import { streamStyle } from '../lib/streamStyles.js';
import StreamBadge from './StreamBadge.jsx';

export function WarningSign({ title = 'Not in the blue bin', children }) {
  return (
    <div role="alert" className="border-2 border-ink bg-white">
      <div className="stripe h-3" />
      <div className="p-4">
        <p className="font-display text-xl font-extrabold uppercase leading-tight">{title}</p>
        <p className="mt-1 font-medium">{children}</p>
      </div>
    </div>
  );
}

function BinSign({ stream, eyebrow, note }) {
  const s = streamStyle(stream);
  return (
    <div className={`flex-1 p-4 ${s.solid}`}>
      <p className="font-display text-sm font-bold uppercase tracking-wider opacity-80">{eyebrow}</p>
      <p className="mt-1 font-stencil text-5xl font-extrabold uppercase leading-[0.9] sm:text-6xl">{stream.label}</p>
      {note && <p className="mt-2 text-sm font-medium opacity-90">{note}</p>}
    </div>
  );
}

export default function VerdictCard({ verdict }) {
  if (!verdict) return null;
  const { item, stream, alternateStream, alert, steps, reminder, split, contaminated } = verdict;
  const toShadyGrove = stream.id.startsWith('SHADY_GROVE');

  return (
    <div className="space-y-4">
      {alert && <WarningSign>{alert}</WarningSign>}

      <div className="frame mx-1.5 my-1.5">
      <div className="panel">
        <div className="flex items-center justify-between gap-3 border-b-2 border-ink px-4 py-2">
          <p className="font-display text-base font-bold uppercase tracking-wide">{item.name}</p>
          {contaminated && !split && <span className="tag bg-hazard text-ink">Contaminated</span>}
        </div>
        {split ? (
          <div className="flex flex-col sm:flex-row">
            <BinSign stream={stream} eyebrow="Clean part" />
            <BinSign stream={getStream('TRASH')} eyebrow="Greasy part" />
          </div>
        ) : (
          <BinSign stream={stream} eyebrow="Goes in" note={stream.sublabel} />
        )}
        <div className="space-y-2 p-4 text-sm">
          <p>{stream.description}</p>
          {alternateStream && (
            <p className="flex items-center gap-2">
              <span className="font-semibold">Or:</span> <StreamBadge stream={alternateStream} />
            </p>
          )}
        </div>
      </div>
      </div>

      {reminder && (
        <div className="border-2 border-bin bg-white p-4">
          <p className="font-display text-sm font-bold uppercase tracking-wider text-bin">Blue bin rule</p>
          <p className="mt-1 font-medium">{reminder}</p>
        </div>
      )}

      <div className="panel p-4">
        <h3 className="text-xl">How to sort it</h3>
        <ol className="mt-3 space-y-2">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-ink font-display text-sm font-bold text-white">{i + 1}</span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        {item.tip && <p className="mt-4 border-l-4 border-kraft pl-3 text-sm">{item.tip}</p>}
      </div>

      {toShadyGrove && (
        <div className="panel p-4">
          <h3 className="text-xl">{SHADY_GROVE.name}</h3>
          <p className="mt-1">{SHADY_GROVE.address}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a className="btn-secondary" href={SHADY_GROVE.mapsUrl} target="_blank" rel="noreferrer">Directions</a>
            <a className="btn-secondary" href={SHADY_GROVE.infoUrl} target="_blank" rel="noreferrer">Hours and what they take</a>
          </div>
        </div>
      )}
    </div>
  );
}
