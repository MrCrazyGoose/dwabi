// Literal Tailwind classes per stream color (Tailwind needs full class names
// at build time).
const STYLES = {
  blue: { bg: 'bg-blue-50', ring: 'ring-blue-200', text: 'text-blue-800', solid: 'bg-blue-600' },
  sky: { bg: 'bg-sky-50', ring: 'ring-sky-200', text: 'text-sky-800', solid: 'bg-sky-600' },
  gray: { bg: 'bg-slate-100', ring: 'ring-slate-300', text: 'text-slate-800', solid: 'bg-slate-600' },
  amber: { bg: 'bg-amber-50', ring: 'ring-amber-200', text: 'text-amber-900', solid: 'bg-amber-500' },
  red: { bg: 'bg-red-50', ring: 'ring-red-200', text: 'text-red-800', solid: 'bg-red-600' },
  purple: { bg: 'bg-purple-50', ring: 'ring-purple-200', text: 'text-purple-800', solid: 'bg-purple-600' },
  orange: { bg: 'bg-orange-50', ring: 'ring-orange-200', text: 'text-orange-900', solid: 'bg-orange-500' },
  lime: { bg: 'bg-lime-50', ring: 'ring-lime-200', text: 'text-lime-900', solid: 'bg-lime-600' },
  green: { bg: 'bg-green-50', ring: 'ring-green-200', text: 'text-green-800', solid: 'bg-green-600' },
  teal: { bg: 'bg-teal-50', ring: 'ring-teal-200', text: 'text-teal-800', solid: 'bg-teal-600' },
  rose: { bg: 'bg-rose-50', ring: 'ring-rose-200', text: 'text-rose-800', solid: 'bg-rose-600' },
};

export function streamStyle(stream) {
  return STYLES[stream?.color] || STYLES.gray;
}
