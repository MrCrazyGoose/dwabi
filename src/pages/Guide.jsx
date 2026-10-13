import { useMemo, useState } from 'react';
import { ITEMS, STREAMS, SHADY_GROVE, decide, searchItems, getStream } from '../../shared/rules.js';
import StreamBadge from '../components/StreamBadge.jsx';
import VerdictCard from '../components/VerdictCard.jsx';
import { streamStyle } from '../lib/streamStyles.js';

const STREAM_ORDER = [
  'BLUE_BIN', 'PAPER', 'TRASH', 'STORE_DROPOFF', 'SHADY_GROVE_HHW', 'SHADY_GROVE_ELECTRONICS',
  'SHADY_GROVE_METAL', 'YARD_TRIM', 'FOOD_SCRAPS', 'DONATE', 'TAKE_BACK',
];

export default function Guide() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState(null);
  const [selected, setSelected] = useState(null);

  const items = useMemo(() => {
    const list = q.trim() ? searchItems(q, ITEMS.length) : [...ITEMS].sort((a, b) => a.name.localeCompare(b.name));
    return filter ? list.filter((i) => i.stream === filter) : list;
  }, [q, filter]);

  const verdict = selected ? decide(selected) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Montgomery County Sorting Guide</h1>
        <p className="mt-1 max-w-3xl text-slate-600">
          What goes in the curbside blue bin, the mixed-paper cart, the trash — and what has to go to the Shady Grove
          Processing Facility and Transfer Station.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-blue-50 p-5 ring-1 ring-blue-200">
          <h2 className="font-bold text-blue-900">🔵 Blue bin — YES</h2>
          <p className="mt-1 text-sm text-blue-900">
            Plastic bottles, jugs, tubs & containers · Aluminum & steel cans · Clean foil · Empty aerosol cans · Glass
            bottles & jars · Milk, juice & broth cartons
          </p>
          <p className="mt-2 text-sm font-semibold text-blue-900">Empty · Rinsed · Clean · Loose (never bagged)</p>
        </div>
        <div className="rounded-2xl bg-red-50 p-5 ring-1 ring-red-200">
          <h2 className="font-bold text-red-900">🚫 Blue bin — NEVER</h2>
          <p className="mt-1 text-sm text-red-900">
            Plastic bags & film · Bagged recyclables · Foam · Batteries · Electronics · Hoses & cords · Food · Greasy
            paper · Drinking glasses & ceramics · Needles · Clothing
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="input sm:max-w-sm"
            placeholder="Search an item…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search items"
          />
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setFilter(null)} className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${filter ? 'bg-white ring-slate-300' : 'bg-eco-600 text-white ring-eco-600'}`}>
              All
            </button>
            {STREAM_ORDER.map((id) => (
              <button
                key={id}
                onClick={() => setFilter(filter === id ? null : id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${filter === id ? 'bg-eco-600 text-white ring-eco-600' : 'bg-white ring-slate-300'}`}
              >
                {STREAMS[id].icon} {STREAMS[id].label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <ul className="card divide-y divide-slate-100 self-start">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setSelected(item.id)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50 ${selected === item.id ? 'bg-eco-50' : ''}`}
                >
                  <span className="font-medium">{item.name}</span>
                  <StreamBadge stream={getStream(item.stream)} size="sm" />
                </button>
              </li>
            ))}
            {items.length === 0 && <li className="p-4 text-sm text-slate-500">No matches. When in doubt, throw it out!</li>}
          </ul>
          <div className="lg:sticky lg:top-24 lg:self-start">
            {verdict ? (
              <VerdictCard verdict={verdict} />
            ) : (
              <div className="card p-6 text-sm text-slate-500">Select an item to see exactly how to sort it.</div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Where things go</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STREAM_ORDER.map((id) => {
            const s = STREAMS[id];
            const st = streamStyle(s);
            return (
              <div key={id} className={`rounded-2xl p-4 ring-1 ${st.bg} ${st.ring}`}>
                <p className={`font-bold ${st.text}`}>{s.icon} {s.label}</p>
                <p className="mt-1 text-sm text-slate-700">{s.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-xl font-bold">📍 {SHADY_GROVE.name}</h2>
        <p className="mt-1 text-slate-600">{SHADY_GROVE.address}</p>
        <p className="mt-3 text-sm text-slate-700">
          Montgomery County residents can bring household hazardous waste (car batteries, paint, chemicals, propane,
          fluorescent bulbs), electronics, scrap metal and other special items here. Check current hours and accepted
          materials before you go.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a className="btn-primary" href={SHADY_GROVE.mapsUrl} target="_blank" rel="noreferrer">Get directions</a>
          <a className="btn-secondary" href={SHADY_GROVE.infoUrl} target="_blank" rel="noreferrer">County facility page</a>
        </div>
      </section>
    </div>
  );
}
