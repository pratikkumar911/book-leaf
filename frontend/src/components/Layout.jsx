import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [logoutError, setLogoutError] = useState('');
  const isAdmin = user?.role === 'admin';
  async function handleLogout() {
    setLogoutError('');
    try {
      await logout();
      nav('/');
    } catch (error) {
      setLogoutError(error.message);
    }
  }

  const nav_link = (path) => ({
    padding: '8px 14px', borderRadius: 6, textDecoration: 'none',
    background: loc.pathname === path ? '#eef2ff' : 'transparent',
    color: '#1e293b', fontWeight: 500,
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 24 }}>
        <strong style={{ fontSize: 18 }}>BookLeaf</strong>
        <nav style={{ display: 'flex', gap: 6 }}>
          {isAdmin ? <Link to="/admin" style={nav_link('/admin')}>Ticket Queue</Link> : (
            <>
              <Link to="/books" style={nav_link('/books')}>My Books</Link>
              <Link to="/tickets" style={nav_link('/tickets')}>My Tickets</Link>
              <Link to="/tickets/new" style={nav_link('/tickets/new')}>New Query</Link>
            </>
          )}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#64748b', fontSize: 14 }}>{user?.email} · {user?.role}</span>
          {logoutError && <span role="alert" style={{ color: '#dc2626', fontSize: 13 }}>{logoutError}</span>}
          <button onClick={handleLogout} style={{ padding: '6px 12px' }}>Log out</button>
        </div>
      </header>
      <main style={{ maxWidth: 1100, margin: '24px auto', padding: '0 24px' }}>{children}</main>
    </div>
  );
}