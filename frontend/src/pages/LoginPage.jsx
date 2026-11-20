import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// Only same-site paths are accepted for ?next=, so the link cannot send people elsewhere.
const safeNext = (value) => (value && value.startsWith('/') && !value.startsWith('//') ? value : '/account');

export default function LoginPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setError(''); setSubmitting(true);
    try {
      if (mode === 'login') await login({ email: form.email, password: form.password });
      else await register(form);
      navigate(next, { replace: true });
    } catch (caught) { setError(caught.message); }
    finally { setSubmitting(false); }
  }

  return (
    <section className="auth-layout">
      <form onSubmit={submit} aria-label={mode === 'login' ? 'Sign in' : 'Create account'}>
        <p className="eyebrow">{mode === 'login' ? 'CUSTOMER SIGN-IN' : 'NEW TEST ACCOUNT'}</p>
        <h1>{mode === 'login' ? 'Sign in' : 'Create an account'}</h1>
        <StatusMessage>Classroom demo: use a fictional name, an @example.com email and a password you do not use anywhere else.</StatusMessage>
        <StatusMessage type="error">{error}</StatusMessage>
        {mode === 'register' && <label>Full name<input name="name" value={form.name} onChange={update} minLength="2" maxLength="80" autoComplete="name" required /></label>}
        <label>Email address<input name="email" type="email" value={form.email} onChange={update} maxLength="120" autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" value={form.password} onChange={update} minLength={mode === 'register' ? 8 : 1} maxLength="128" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>
        <button disabled={submitting}>{submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <button type="button" className="button secondary" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
          {mode === 'login' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
        </button>
      </form>
    </section>
  );
}
