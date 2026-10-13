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
    <div className="space-y-10">
      <div>
        <h1 className="text-5xl">Sorting guide</h1>
        <p className="mt-2 max-w-2xl text-lg">
          The blue bin, the paper cart, the trash, and what has to go to the Shady Grove transfer station.
        </p>
      </div>

      <section className="grid border-2 border-ink md:grid-cols-2">
        <div className="bg-bin p-5 text-white md:border-r-2 md:border-ink">
          <h2 className="text-3xl">Blue bin: yes</h2>
          <p className="mt-2">
            Plastic bottles, jugs, tubs and containers. Aluminum and steel cans. Clean foil. Empty aerosol cans. Glass
            bottles and jars. Milk, juice and broth cartons.
          </p>
          <p className="mt-3 font-display text-lg font-bold uppercase">Empty, rinsed, loose. Never bagged.</p>
        </div>
        <div className="border-t-2 border-ink bg-white md:border-t-0">
          <div className="stripe h-3" />
          <div className="p-5">
            <h2 className="text-3xl">Blue bin: never</h2>
            <p className="mt-2">
              Plastic bags and film. Bagged recyclables. Foam. Batteries. Electronics. Hoses and cords. Food. Greasy
              paper. Drinking glasses and dishes. Needles. Clothing.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <input
          className="input sm:max-w-md"
          placeholder="Search an item"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search items"
        />
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFilter(null)} className={`tag border-2 border-ink ${filter ? 'bg-white' : 'bg-ink text-white'}`}>All</button>
          {STREAM_ORDER.map((id) => (
            <button
              key={id}
              onClick={() => setFilter(filter === id ? null : id)}
              className={`tag border-2 border-ink ${filter === id ? 'bg-ink text-white' : 'bg-white'}`}
            >
              {STREAMS[id].short}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <ul className="panel self-start">
            {items.map((item) => (
              <li key={item.id} className="border-b border-ink/15 last:border-0">
                <button
                  onClick={() => setSelected(item.id)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left ${
                    selected === item.id ? 'bg-paper font-semibold' : 'hover:bg-paper'
                  }`}
                >
                  <span>{item.name}</span>
                  <StreamBadge stream={getStream(item.stream)} />
                </button>
              </li>
            ))}
            {items.length === 0 && <li className="p-4 text-ash">Nothing matches. If you are not sure, it goes in the trash.</li>}
          </ul>
          <div className="lg:sticky lg:top-20 lg:self-start">
            {verdict ? (
              <VerdictCard verdict={verdict} />
            ) : (
              <div className="border-2 border-dashed border-ink/40 p-8 text-center text-ash">Pick an item to see how to sort it.</div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-3xl">Where things go</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STREAM_ORDER.map((id) => {
            const s = STREAMS[id];
            return (
              <div key={id} className="panel">
                <p className={`px-4 py-2 font-display text-xl font-bold uppercase ${streamStyle(s).solid}`}>{s.label}</p>
                <p className="p-4 text-sm">{s.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="text-3xl">{SHADY_GROVE.name}</h2>
        <p className="mt-1 text-lg">{SHADY_GROVE.address}</p>
        <p className="mt-3 max-w-3xl">
          County residents can drop off household hazardous waste (car batteries, paint, chemicals, propane, fluorescent
          bulbs), electronics, scrap metal and other special items here. Check the hours before you go.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a className="btn-primary" href={SHADY_GROVE.mapsUrl} target="_blank" rel="noreferrer">Directions</a>
          <a className="btn-secondary" href={SHADY_GROVE.infoUrl} target="_blank" rel="noreferrer">County page</a>
        </div>
      </section>
    </div>
  );
}
