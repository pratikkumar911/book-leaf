import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@bookleaf.com');
  const [password, setPassword] = useState('bookleaf123');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setErr(null); setBusy(true);
    try { await login(email, password); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ maxWidth: 380, margin: '80px auto', padding: 24, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
      <h2 style={{ marginTop: 0 }}>Sign in</h2>
      <p style={{ color: '#64748b', fontSize: 13, marginTop: -6 }}>
        Demo: admin@bookleaf.com or priya.sharma@email.com · password bookleaf123
      </p>
      <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" required
          style={{ padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' }} />
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" required
          style={{ padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' }} />
        {err && <div style={{ color: '#dc2626', fontSize: 13 }}>{err}</div>}
        <button disabled={busy} style={{ padding: 10, borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}