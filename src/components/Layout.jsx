import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { COUNTY_INFO_URL } from '../../shared/rules.js';

const NAV = [
  { to: '/scan', label: 'Scan' },
  { to: '/guide', label: 'Guide' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/log', label: 'Log a batch' },
];

function navClass({ isActive }) {
  return `border-b-4 px-1 py-1 font-display text-lg font-bold uppercase tracking-wide ${
    isActive ? 'border-bin text-ink' : 'border-transparent text-ink/70 hover:text-ink'
  }`;
}

function mobileClass({ isActive }) {
  return `block border-l-4 px-3 py-2 font-display text-xl font-bold uppercase ${
    isActive ? 'border-bin bg-paper' : 'border-transparent'
  }`;
}

export default function Layout() {
  const { user, stats, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-2.5">
          <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <img src="/favicon.svg" alt="" className="h-8 w-8" />
            <span className="font-display text-2xl font-extrabold uppercase tracking-tight">EcoSort</span>
          </Link>
          <nav className="hidden items-center gap-5 lg:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={navClass}>{n.label}</NavLink>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-3 lg:flex">
            {user ? (
              <>
                <NavLink to="/dashboard" className={navClass}>
                  {user.displayName}
                  {stats && <span className="ml-2 bg-ink px-1.5 py-0.5 text-sm text-white">{stats.competitionPoints}</span>}
                </NavLink>
                <button onClick={logout} className="btn-secondary !px-3 !py-1 !text-base">Log out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary !px-3 !py-1 !text-base">Log in</Link>
                <Link to="/register" className="btn-primary !px-3 !py-1 !text-base">Sign up</Link>
              </>
            )}
          </div>
          <button
            className="ml-auto border-2 border-ink px-3 py-1 font-display font-bold uppercase lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
        {open && (
          <nav className="border-t-2 border-ink py-2 lg:hidden" onClick={() => setOpen(false)}>
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={mobileClass}>{n.label}</NavLink>
            ))}
            {user ? (
              <>
                <NavLink to="/dashboard" className={mobileClass}>
                  {user.displayName} {stats && `(${stats.competitionPoints} pts)`}
                </NavLink>
                <button onClick={logout} className="block w-full border-l-4 border-transparent px-3 py-2 text-left font-display text-xl font-bold uppercase">
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={mobileClass}>Log in</NavLink>
                <NavLink to="/register" className={mobileClass}>Sign up</NavLink>
              </>
            )}
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t-2 border-ink bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 text-sm text-ash">
          Sorting rules follow Montgomery County DEP guidance. Check anything unusual at{' '}
          <a className="font-semibold text-ink underline" href={COUNTY_INFO_URL} target="_blank" rel="noreferrer">
            montgomerycountymd.gov/sws
          </a>
          . Photos you scan stay on your phone.
        </div>
      </footer>
    </div>
  );
}
