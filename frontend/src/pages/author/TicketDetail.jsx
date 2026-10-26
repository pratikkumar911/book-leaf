import { useParams, Link } from 'react-router-dom';
import { useGetTicketQuery } from '../../store/api.js';

export default function TicketDetail() {
  const { id } = useParams();
  const { data: ticket, isLoading, error } = useGetTicketQuery(id, {
    pollingInterval: 10000,
    refetchOnMountOrArgChange: true,
  });

  if (isLoading) {
    return <div style={{ color: '#64748b' }}>Loading ticket…</div>;
  }

  if (error) {
    return (
      <div style={{ color: '#dc2626' }}>
        {error.data?.error || error.message || 'Failed to load ticket.'}
      </div>
    );
  }

  if (!ticket) {
    return (
      <div>
        Ticket not found. <Link to="/tickets">Back to tickets</Link>
      </div>
    );
  }

  // Author never sees internal admin notes — belt-and-suspenders (backend already filters).
  const visibleMessages = (ticket.messages || []).filter((m) => !m.is_internal);

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Link
          to="/tickets"
          style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}
        >
          ← All tickets
        </Link>
      </div>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 6px' }}>{ticket.subject}</h2>
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              fontSize: 13,
              color: '#64748b',
              flexWrap: 'wrap',
            }}
          >
            <span>{ticket.category || 'Uncategorized'}</span>
            <span>·</span>
            <span>Priority {ticket.priority || '—'}</span>
            <span>·</span>
            <span style={statusBadge(ticket.status)}>{ticket.status}</span>
          </div>
        </div>
        <div style={{ fontSize: 12, whiteSpace: 'nowrap', paddingTop: 4, color: '#64748b' }}>
          Auto-refreshes every 10 seconds
        </div>
      </div>

      {/* Book context (only shown if the ticket is linked to a specific book) */}
      {ticket.book && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            background: '#f8fafc',
            borderRadius: 6,
            fontSize: 13,
            color: '#475569',
          }}
        >
          <strong>Book:</strong> {ticket.book.title}
          {ticket.book.isbn ? ` · ISBN ${ticket.book.isbn}` : ''}
        </div>
      )}

      {/* Thread */}
      <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
        {visibleMessages.map((m) => (
          <div
            key={m.id}
            style={{
              background: m.sender_type === 'admin' ? '#eff6ff' : '#fff',
              padding: 14,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
              {m.sender_type === 'admin' ? 'BookLeaf Support' : 'You'} ·{' '}
              {new Date(m.created_at).toLocaleString()}
            </div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.content}</div>
          </div>
        ))}

        {visibleMessages.length === 0 && (
          <div style={{ fontSize: 13, color: '#94a3b8' }}>No messages yet.</div>
        )}
      </div>

      {/* Footer hint */}
      {ticket.status !== 'Closed' && ticket.status !== 'Resolved' && (
        <div
          style={{
            marginTop: 24,
            fontSize: 13,
            color: '#64748b',
            padding: 14,
            background: '#f8fafc',
            borderRadius: 8,
          }}
        >
          This ticket is {ticket.status.toLowerCase()}. BookLeaf Support typically
          replies within 48 hours.
        </div>
      )}
    </div>
  );
}

function statusBadge(status) {
  const styles = {
    Open: { bg: '#fef2f2', fg: '#b91c1c' },
    'In Progress': { bg: '#eff6ff', fg: '#1d4ed8' },
    Resolved: { bg: '#ecfdf5', fg: '#047857' },
    Closed: { bg: '#f1f5f9', fg: '#475569' },
  };
  const s = styles[status] || { bg: '#f1f5f9', fg: '#475569' };
  return {
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    background: s.bg,
    color: s.fg,
  };
}