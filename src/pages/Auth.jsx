import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { SCHOOLS } from '../../shared/schools.js';

function AuthCard({ title, subtitle, children }) {
  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(form.username, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Welcome back" subtitle="Log in to keep earning points for your school.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="username">Username</label>
          <input id="username" className="input" autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="input" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="text-center text-sm text-slate-600">
          New here? <Link to="/register" className="font-semibold text-eco-700">Create an account</Link>
        </p>
      </form>
    </AuthCard>
  );
}

const LEVEL_LABEL = { high: 'High schools', middle: 'Middle schools', neighborhood: 'Neighborhood clusters' };

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', displayName: '', password: '', schoolId: '', grade: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const grouped = useMemo(() => {
    const g = {};
    for (const s of [...SCHOOLS].sort((a, b) => a.name.localeCompare(b.name))) (g[s.level] ||= []).push(s);
    return g;
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({ ...form, grade: form.grade === '' ? null : Number(form.grade) });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Join the Zero-Waste Challenge" subtitle="Pick your school or neighborhood and start earning points.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="displayName">Display name (shown on the leaderboard)</label>
          <input id="displayName" className="input" maxLength={30} value={form.displayName} onChange={set('displayName')} placeholder="e.g. Jordan K." required />
          <p className="mt-1 text-xs text-slate-500">Use a first name and last initial or a nickname — never your full name.</p>
        </div>
        <div>
          <label className="label" htmlFor="username">Username</label>
          <input id="username" className="input" autoComplete="username" maxLength={20} value={form.username} onChange={set('username')} required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="input" autoComplete="new-password" minLength={8} value={form.password} onChange={set('password')} required />
        </div>
        <div>
          <label className="label" htmlFor="schoolId">School or neighborhood cluster</label>
          <select id="schoolId" className="input" value={form.schoolId} onChange={set('schoolId')} required>
            <option value="">Choose…</option>
            {['high', 'middle', 'neighborhood'].map((level) => (
              <optgroup key={level} label={LEVEL_LABEL[level]}>
                {grouped[level]?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="grade">Grade (optional)</label>
          <select id="grade" className="input" value={form.grade} onChange={set('grade')}>
            <option value="">Prefer not to say</option>
            {[6, 7, 8, 9, 10, 11, 12].map((g) => <option key={g} value={g}>{g}th grade</option>)}
          </select>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="text-center text-xs text-slate-500">We never ask for your email, phone number or full name.</p>
        <p className="text-center text-sm text-slate-600">
          Already have an account? <Link to="/login" className="font-semibold text-eco-700">Log in</Link>
        </p>
      </form>
    </AuthCard>
  );
}
