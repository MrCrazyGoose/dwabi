// MoCoBin mark: camera viewfinder corners around a blue bin.
export function LogoMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M2 11V2h9M29 2h9v9M38 29v9h-9M11 38H2v-9" fill="none" stroke="#141414" strokeWidth="3.5" />
      <rect x="11" y="11" width="18" height="3.5" fill="#1C4FA0" />
      <rect x="16.5" y="8" width="7" height="3" fill="#1C4FA0" />
      <path d="M12.5 16h15l-1.8 15H14.3z" fill="#1C4FA0" />
      <path d="M17.5 19.5v8M22.5 19.5v8" stroke="#fff" strokeWidth="1.6" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="font-stencil text-[1.7rem] font-extrabold leading-none tracking-tight">
      MoCo<span className="text-bin">Bin</span>
    </span>
  );
}
