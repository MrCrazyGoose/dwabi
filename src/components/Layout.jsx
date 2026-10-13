import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { COUNTY_INFO_URL } from '../../shared/rules.js';

const NAV = [
  { to: '/scan', label: 'Scan' },
  { to: '/guide', label: 'Sorting Guide' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/quiz', label: 'Weekly Quiz' },
  { to: '/log', label: 'Log a Batch' },
];

function navClass({ isActive }) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-eco-100 text-eco-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;
}

export default function Layout() {
  const { user, stats, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-extrabold text-eco-700">
            <img src="/favicon.svg" alt="" className="h-8 w-8" />
            <span className="text-lg">EcoSort</span>
            <span className="hidden rounded-full bg-eco-50 px-2 py-0.5 text-xs font-semibold text-eco-700 ring-1 ring-eco-200 sm:inline">
              MoCo
            </span>
          </Link>
          <nav className="ml-4 hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={navClass}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            {user ? (
              <>
                <NavLink to="/dashboard" className={navClass}>
                  <span className="font-semibold">{user.displayName}</span>
                  {stats && <span className="ml-2 rounded-full bg-eco-600 px-2 py-0.5 text-xs text-white">{stats.competitionPoints} pts</span>}
                </NavLink>
                <button onClick={logout} className="btn-secondary !py-1.5">Log out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary !py-1.5">Log in</Link>
                <Link to="/register" className="btn-primary !py-1.5">Join the challenge</Link>
              </>
            )}
          </div>
          <button
            className="ml-auto rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d={open ? 'M6 6l12 12M6 18L18 6' : 'M4 7h16M4 12h16M4 17h16'} />
            </svg>
          </button>
        </div>
        {open && (
          <nav className="border-t border-slate-200 px-4 py-2 lg:hidden" onClick={() => setOpen(false)}>
            <div className="flex flex-col gap-1">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} className={navClass}>
                  {n.label}
                </NavLink>
              ))}
              {user ? (
                <>
                  <NavLink to="/dashboard" className={navClass}>
                    My dashboard {stats && `· ${stats.competitionPoints} pts`}
                  </NavLink>
                  <button onClick={logout} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100">
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <NavLink to="/login" className={navClass}>Log in</NavLink>
                  <NavLink to="/register" className={navClass}>Join the challenge</NavLink>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            EcoSort is a student engagement project for Montgomery County, Maryland (MD-8). Sorting guidance follows
            Montgomery County DEP recycling rules — always confirm at{' '}
            <a className="font-medium text-eco-700 underline" href={COUNTY_INFO_URL} target="_blank" rel="noreferrer">
              montgomerycountymd.gov/sws
            </a>
            .
          </p>
          <p>Photos are analyzed on your device and never uploaded.</p>
        </div>
      </footer>
    </div>
  );
}
