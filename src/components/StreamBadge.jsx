import { streamStyle } from '../lib/streamStyles.js';

export default function StreamBadge({ stream, size = 'md' }) {
  if (!stream) return null;
  const s = streamStyle(stream);
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${s.bg} ${s.ring} ${s.text} ${pad}`}>
      <span aria-hidden>{stream.icon}</span>
      {stream.label}
    </span>
  );
}
