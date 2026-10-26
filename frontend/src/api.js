// Auth-only helper. Server-state (books, tickets, admin) lives in src/store/api.js (RTK Query).
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
let refreshPromise;

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    }).then(async (res) => {
      if (res.status === 401) return false;
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const error = new Error(body.error || `HTTP ${res.status}`);
        error.status = res.status;
        throw error;
      }
      return true;
    }).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function request(path, opts = {}, retry = true) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (
    res.status === 401 &&
    retry &&
    !['/api/auth/login', '/api/auth/refresh'].includes(path)
  ) {
    if (await refreshSession()) return request(path, opts, false);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(json.error || `HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return json;
}

export const api = {
  login: (email, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, false),
  me: () => request('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }, false),
};
