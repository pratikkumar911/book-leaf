// frontend/src/api.js
// Auth-only helper. Server-state (books, tickets, admin) lives in src/store/api.js (RTK Query).
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, opts = {}) {
  const token = localStorage.getItem('bl_token');
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

export const api = {
  login: (email, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request('/api/auth/me'),
};