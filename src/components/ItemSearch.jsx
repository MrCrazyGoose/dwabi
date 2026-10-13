import { useMemo, useState } from 'react';
import { getStream, searchItems } from '../../shared/rules.js';
import StreamBadge from './StreamBadge.jsx';

export default function ItemSearch({ onSelect, placeholder = 'pizza box, battery, plastic bag...' }) {
  const [q, setQ] = useState('');
  const results = useMemo(() => (q.trim() ? searchItems(q, 8) : []), [q]);

  return (
    <div className="relative">
      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label="Search items" />
      {results.length > 0 && (
        <ul className="absolute z-20 -mt-0.5 max-h-80 w-full overflow-auto border-2 border-ink bg-white">
          {results.map((item) => (
            <li key={item.id} className="border-b border-ink/15 last:border-0">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-paper"
                onClick={() => {
                  onSelect(item);
                  setQ('');
                }}
              >
                <span className="font-medium">{item.name}</span>
                <StreamBadge stream={getStream(item.stream)} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
