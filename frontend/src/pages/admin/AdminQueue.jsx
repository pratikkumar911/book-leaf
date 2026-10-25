import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetAdminTicketsQuery, useGetAdminStatsQuery } from '../../store/api.js';

export default function AdminQueue() {
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
    sort: 'priority',
  });

  // Build query string from filters — RTK Query treats each combination as its own cache key.
  const qs = (() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    return p.toString();
  })();

  const {
    data: tickets = [],
    isLoading,
    error,
  } = useGetAdminTicketsQuery(qs, { pollingInterval: 15000 });

  const { data: stats } = useGetAdminStatsQuery(undefined, { pollingInterval: 30000 });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ marginTop: 0 }}>Ticket Queue</h2>
        {stats && (
          <div style={{ fontSize: 13, color: '#475569' }}>
            {stats.total} tickets · Open: {stats.byStatus.Open || 0} · In Progress:{' '}
            {stats.byStatus['In Progress'] || 0}
            {stats.aiFallbackRate > 0 &&
              ` · AI fallback ${(stats.aiFallbackRate * 100).toFixed(0)}%`}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Sel
          label="Status"
          value={filters.status}
          onChange={(v) => setFilters({ ...filters, status: v })}
          options={['', 'Open', 'In Progress', 'Resolved', 'Closed']}
        />
        <Sel
          label="Category"
          value={filters.category}
          onChange={(v) => setFilters({ ...filters, category: v })}
          options={[
            '',
            'Royalty & Payments',
            'ISBN & Metadata Issues',
            'Printing & Quality',
            'Distribution & Availability',
            'Book Status & Production Updates',
            'General Inquiry',
          ]}
        />
        <Sel
          label="Priority"
          value={filters.priority}
          onChange={(v) => setFilters({ ...filters, priority: v })}
          options={['', 'Critical', 'High', 'Medium', 'Low']}
        />
        <Sel
          label="Sort"
          value={filters.sort}
          onChange={(v) => setFilters({ ...filters, sort: v })}
          options={['priority', 'recent']}
        />
      </div>

      {isLoading && <div style={{ color: '#64748b' }}>Loading queue…</div>}
      {error && (
        <div style={{ color: '#dc2626' }}>{error.data?.error || error.message}</div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {tickets.map((t) => (
          <Link key={t.id} to={`/admin/tickets/${t.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div
              style={{
                background: '#fff',
                padding: 14,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{t.subject}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {t.author?.name} · {t.book?.title || 'Account'} ·{' '}
                  {new Date(t.created_at).toLocaleString()}
                </div>
              </div>
              <Pill text={t.category || '—'} color="#0f172a" bg="#f1f5f9" />
              <Pill text={t.priority || '—'} color={pc(t.priority)} bg={pb(t.priority)} />
              <Pill text={t.status} color="#1d4ed8" bg="#eff6ff" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Sel({ label, value, onChange, options }) {
  return (
    <label style={{ fontSize: 13, color: '#475569' }}>
      {label}{' '}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: 6, borderRadius: 6, border: '1px solid #cbd5e1' }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o || 'All'}
          </option>
        ))}
      </select>
    </label>
  );
}

function Pill({ text, color, bg }) {
  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: bg,
        color,
      }}
    >
      {text}
    </span>
  );
}

const pc = (p) =>
  ({ Critical: '#b91c1c', High: '#c2410c', Medium: '#a16207', Low: '#475569' }[p] ||
  '#475569');
const pb = (p) =>
  ({ Critical: '#fef2f2', High: '#fff7ed', Medium: '#fefce8', Low: '#f1f5f9' }[p] ||
  '#f1f5f9');