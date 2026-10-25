import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { supabase } from '../../supabaseClient.js';
import { useAuth } from '../../AuthContext.jsx';
import {
  bookleafApi,
  useGetAdminTicketQuery,
  useUpdateTicketMutation,
  useReplyTicketMutation,
  useDraftTicketMutation,
  useRetryAIMutation,
} from '../../store/api.js';

const CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

export default function AdminTicketDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { user } = useAuth();

  // Local UI state
  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [draftSource, setDraftSource] = useState('manual');
  const [notice, setNotice] = useState(null);

  // Server state via RTK Query
  const { data: ticket, isLoading, error } = useGetAdminTicketQuery(id, {
    pollingInterval: 30000,
  });
  const [updateTicket] = useUpdateTicketMutation();
  const [replyTicket, { isLoading: sending }] = useReplyTicketMutation();
  const [generateDraft, { isLoading: drafting }] = useDraftTicketMutation();
  const [retryAI] = useRetryAIMutation();

  // Realtime: invalidate the ticket cache when messages or ticket row change
  useEffect(() => {
    const ch = supabase
      .channel(`admin-ticket-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${id}` },
        () => dispatch(bookleafApi.util.invalidateTags([{ type: 'Ticket', id }]))
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tickets', filter: `id=eq.${id}` },
        () =>
          dispatch(
            bookleafApi.util.invalidateTags([{ type: 'Ticket', id }, 'AdminQueue'])
          )
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [id, dispatch]);

  async function handleGenerateDraft() {
    setNotice(null);
    try {
      const res = await generateDraft(id).unwrap();
      setReply(res.draft);
      setDraftSource(res.source);
      setNotice(
        res.source === 'template'
          ? 'AI unavailable — using BookLeaf template. Edit before sending.'
          : 'AI draft generated. Review before sending.'
      );
    } catch (e) {
      setNotice(`Draft failed: ${e.data?.error || e.message}. Please write manually.`);
      setDraftSource('manual');
    }
  }

  async function handleSendReply() {
    if (!reply.trim()) return;
    try {
      await replyTicket({
        id,
        content: reply,
        is_internal: isInternal,
        draft_source: draftSource,
      }).unwrap();
      setReply('');
      setIsInternal(false);
      setDraftSource('manual');
    } catch (e) {
      setNotice(`Send failed: ${e.data?.error || e.message}`);
    }
  }

  async function patch(body) {
    try {
      await updateTicket({ id, ...body }).unwrap();
    } catch (e) {
      setNotice(`Update failed: ${e.data?.error || e.message}`);
    }
  }

  if (isLoading) return <div style={{ color: '#64748b' }}>Loading ticket…</div>;
  if (error)
    return <div style={{ color: '#dc2626' }}>{error.data?.error || error.message}</div>;
  if (!ticket) return <div>Not found.</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
      <div>
        <h2 style={{ marginTop: 0 }}>{ticket.subject}</h2>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
          {ticket.author?.name} ({ticket.author?.email}) ·{' '}
          {ticket.book?.title || 'Account-level'}
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {(ticket.messages || []).map((m) => (
            <div
              key={m.id}
              style={{
                background: m.is_internal
                  ? '#fefce8'
                  : m.sender_type === 'admin'
                  ? '#eff6ff'
                  : '#fff',
                padding: 14,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                {m.is_internal
                  ? 'Internal note'
                  : m.sender_type === 'admin'
                  ? 'You (BookLeaf)'
                  : ticket.author?.name}{' '}
                · {new Date(m.created_at).toLocaleString()}
                {m.draft_source && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: '#94a3b8' }}>
                    via {m.draft_source}
                  </span>
                )}
              </div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.content}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 20,
            background: '#fff',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'center' }}>
            <button onClick={handleGenerateDraft} disabled={drafting} style={btn}>
              {drafting ? 'Generating…' : 'Generate AI draft'}
            </button>
            <label style={{ fontSize: 13, color: '#475569' }}>
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
              />{' '}
              Internal note (not visible to author)
            </label>
          </div>
          {notice && (
            <div style={{ fontSize: 12, color: '#a16207', marginBottom: 8 }}>{notice}</div>
          )}
          <textarea
            value={reply}
            onChange={(e) => {
              setReply(e.target.value);
              setDraftSource('manual');
            }}
            rows={8}
            placeholder="Write or edit the response…"
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ marginTop: 8 }}>
            <button
              onClick={handleSendReply}
              disabled={!reply.trim() || sending}
              style={{ ...btn, background: '#2563eb', color: '#fff', border: 'none' }}
            >
              {sending ? 'Sending…' : isInternal ? 'Save internal note' : 'Send to author'}
            </button>
          </div>
        </div>
      </div>

      <aside>
        <div style={card}>
          <h3 style={h3}>Classification</h3>
          <div style={field}>
            <div style={label}>Category</div>
            <select
              value={ticket.override_category || ticket.category || ''}
              onChange={(e) => patch({ override_category: e.target.value })}
              style={input}
            >
              <option value="">— Select —</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div style={small}>
              AI: {ticket.ai_category || '—'}
              {ticket.override_category && ' · overridden'}
              {ticket.ai_status === 'fallback' && ' · fallback used'}
            </div>
          </div>
          <div style={field}>
            <div style={label}>Priority</div>
            <select
              value={ticket.override_priority || ticket.priority || ''}
              onChange={(e) => patch({ override_priority: e.target.value })}
              style={input}
            >
              <option value="">— Select —</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <div style={small}>
              AI: {ticket.ai_priority || '—'}
              {ticket.override_priority && ' · overridden'}
            </div>
          </div>
          {ticket.ai_status !== 'succeeded' && (
            <button onClick={() => retryAI(id)} style={btn}>
              Retry AI classification
            </button>
          )}
        </div>

        <div style={card}>
          <h3 style={h3}>Status</h3>
          <select
            value={ticket.status}
            onChange={(e) => patch({ status: e.target.value })}
            style={input}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div style={card}>
          <h3 style={h3}>Assignment</h3>
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>
            {ticket.assigned_to === user.id
              ? 'Assigned to you'
              : ticket.assigned_to
              ? 'Assigned'
              : 'Unassigned'}
          </div>
          {ticket.assigned_to !== user.id && (
            <button onClick={() => patch({ assigned_to: user.id })} style={btn}>
              Assign to me
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

const btn = {
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  background: '#fff',
  cursor: 'pointer',
  fontSize: 13,
};
const card = {
  background: '#fff',
  padding: 16,
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  marginBottom: 12,
};
const h3 = { margin: '0 0 10px', fontSize: 14 };
const input = {
  width: '100%',
  padding: 8,
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  marginTop: 4,
};
const field = { marginBottom: 12 };
const label = { fontSize: 12, color: '#475569', marginBottom: 2 };
const small = { fontSize: 11, color: '#94a3b8', marginTop: 4 };