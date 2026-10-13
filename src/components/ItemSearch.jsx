import { useMemo, useState } from 'react';
import { searchItems } from '../../shared/rules.js';
import StreamBadge from './StreamBadge.jsx';
import { getStream } from '../../shared/rules.js';

export default function ItemSearch({ onSelect, placeholder = 'Search: pizza box, battery, plastic bag…', autoFocus }) {
  const [q, setQ] = useState('');
  const results = useMemo(() => (q.trim() ? searchItems(q, 8) : []), [q]);

  return (
    <div className="relative">
      <input
        className="input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label="Search items"
      />
      {results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-200">
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => {
                  onSelect(item);
                  setQ('');
                }}
              >
                <span className="font-medium">{item.name}</span>
                <StreamBadge stream={getStream(item.stream)} size="sm" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
