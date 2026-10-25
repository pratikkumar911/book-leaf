import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetBooksQuery, useCreateTicketMutation } from '../../store/api.js';

export default function NewTicket() {
  const { data: books = [] } = useGetBooksQuery();   // served from cache — 0 API call
  const [createTicket, { isLoading, error }] = useCreateTicketMutation();
  const [form, setForm] = useState({ book_id: '', subject: '', description: '' });
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    try {
      const t = await createTicket({
        book_id: form.book_id || null,
        subject: form.subject,
        description: form.description,
      }).unwrap();
      nav(`/tickets/${t.id}`);
    } catch { /* error shown below via `error` */ }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h2>Raise a support query</h2>
      <form onSubmit={submit} style={{ display: 'grid', gap: 12, background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <label>
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>Which book is this about?</div>
          <select value={form.book_id} onChange={e => setForm({ ...form, book_id: e.target.value })}
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }}>
            <option value="">General / Account Level</option>
            {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
        </label>
        <label>
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>Subject</div>
          <input required minLength={3} value={form.subject}
            onChange={e => setForm({ ...form, subject: e.target.value })}
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }} />
        </label>
        <label>
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>Description</div>
          <textarea required minLength={10} rows={6} value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }} />
        </label>
        {error && <div style={{ color: '#dc2626', fontSize: 13 }}>{error.data?.error || error.message}</div>}
        <button disabled={isLoading} style={{ padding: 10, borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}>
          {isLoading ? 'Submitting…' : 'Submit query'}
        </button>
      </form>
    </div>
  );
}