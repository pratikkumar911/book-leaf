import { useGetBooksQuery } from '../../store/api.js';

export default function MyBooks() {
  const { data: books = [], isLoading, error } = useGetBooksQuery();

  if (isLoading) return <div>Loading books…</div>;
  if (error) return <div style={{ color: 'red' }}>{error.data?.error || error.message}</div>;
  if (!books.length) return <div>No books yet.</div>;

  return (
    <div>
      <h2>My Books</h2>
      <div style={{ display: 'grid', gap: 12 }}>
        {books.map(b => (
          <div key={b.id} style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{b.title}</strong>
              <span style={{ fontSize: 12, color: '#64748b' }}>{b.status}</span>
            </div>
            <div style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>
              ISBN: {b.isbn || '—'} · {b.genre || '—'} · Published: {b.publication_date || 'TBD'} · MRP ₹{b.mrp ?? '—'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 12, fontSize: 13 }}>
              <Stat label="Copies sold" value={b.total_copies_sold ?? 0} />
              <Stat label="Royalty earned" value={`₹${b.total_royalty_earned ?? 0}`} />
              <Stat label="Royalty paid" value={`₹${b.royalty_paid ?? 0}`} />
              <Stat label="Royalty pending" value={`₹${b.royalty_pending ?? 0}`} highlight />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div style={{ background: highlight ? '#fff7ed' : '#f8fafc', padding: 8, borderRadius: 6 }}>
      <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
      <div style={{ fontWeight: 600, color: highlight ? '#c2410c' : '#0f172a' }}>{value}</div>
    </div>
  );
}