import { Link } from 'react-router-dom';
import { useGetMyTicketsQuery } from '../../store/api.js';

export default function MyTickets() {
  const { data: tickets = [], isLoading, error } = useGetMyTicketsQuery(undefined, {
    pollingInterval: 20000,
  });

  if (isLoading) return <div style={{ color: '#64748b' }}>Loading tickets…</div>;
  if (error)
    return (
      <div style={{ color: '#dc2626' }}>{error.data?.error || error.message}</div>
    );
  if (!tickets.length)
    return (
      <div>
        No tickets yet. <Link to="/tickets/new">Raise one →</Link>
      </div>
    );

  return (
    <div>
      <h2>My Tickets</h2>
      <div style={{ display: 'grid', gap: 8 }}>
        {tickets.map((t) => (
          <Link key={t.id} to={`/tickets/${t.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div
              style={{
                background: '#fff',
                padding: 14,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{t.subject}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {t.category || 'Uncategorized'} · {new Date(t.created_at).toLocaleString()}
                </div>
              </div>
              <span style={badge(t.status)}>{t.status}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const badge = (s) => ({
  padding: '4px 10px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  background:
    { Open: '#fef2f2', 'In Progress': '#eff6ff', Resolved: '#ecfdf5', Closed: '#f1f5f9' }[s] ||
    '#f1f5f9',
  color:
    { Open: '#b91c1c', 'In Progress': '#1d4ed8', Resolved: '#047857', Closed: '#475569' }[s] ||
    '#475569',
});