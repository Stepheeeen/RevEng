'use client';

import React, { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function useAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('trinity_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ─── Signal Details Modal ──────────────────────────────────────────────────── */
function SignalModal({ signal, onClose }: { signal: any; onClose: () => void }) {
  const d = signal.signal_details || {};

  // Generic human-readable key formatter
  const formatKey = (k: string) =>
    k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Fields we know about — displayed first in a structured way
  const knownFields: { key: string; label: string; render?: (v: any) => React.ReactNode }[] = [
    {
      key: 'job_title',
      label: 'Position',
      render: (v) => <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>{v}</span>,
    },
    {
      key: 'days_active',
      label: 'Listing Age',
      render: (v) => (
        <span style={{ color: v > 30 ? 'var(--text-1)' : 'var(--text-2)' }}>
          {v} day{v !== 1 ? 's' : ''} active
        </span>
      ),
    },
    {
      key: 'job_url',
      label: 'Job Listing',
      render: (v) => (
        <a href={v} target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--text-2)', textDecoration: 'underline', textUnderlineOffset: '3px', wordBreak: 'break-all', fontSize: '12px' }}>
          {v}
        </a>
      ),
    },
    {
      key: 'scraper_source',
      label: 'Detected From',
      render: (v) => (
        <a href={v} target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--text-2)', textDecoration: 'underline', textUnderlineOffset: '3px', wordBreak: 'break-all', fontSize: '12px' }}>
          {v}
        </a>
      ),
    },
  ];

  // Any remaining unknown fields
  const knownKeys = knownFields.map((f) => f.key);
  const extraFields = Object.entries(d).filter(([k]) => !knownKeys.includes(k));

  // Close on backdrop click or Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
          background: 'var(--surface-1)',
          border: '1px solid var(--border-2)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        {/* Modal header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="section-label" style={{ marginBottom: '4px' }}>Hiring Signal</div>
            <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-1)' }}>{signal.company_name}</div>
            <a
              href={`https://${signal.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '12px', color: 'var(--text-3)', textDecoration: 'none' }}
            >
              {signal.domain}
            </a>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '20px', lineHeight: 1, padding: '0 0 0 16px', flexShrink: 0 }}
          >
            ×
          </button>
        </div>

        {/* Modal body */}
        <div style={{ padding: '20px' }}>

          {/* Status + date row */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <span className={`badge ${signal.status === 'ROUTED_TO_CRM' ? 'badge-success' : 'badge-warn'}`}>
              {signal.status === 'ROUTED_TO_CRM' ? 'Routed to CRM' : 'Pending Dispatch'}
            </span>
            {signal.created_at && (
              <span className="badge badge-muted">
                Detected {new Date(signal.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>

          {/* Structured known fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {knownFields
              .filter((f) => d[f.key] !== undefined && d[f.key] !== null && d[f.key] !== '')
              .map((f, i, arr) => (
                <div
                  key={f.key}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: '4px',
                    padding: '12px 0',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border-1)' : 'none',
                  }}
                >
                  <div className="section-label">{f.label}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                    {f.render ? f.render(d[f.key]) : String(d[f.key])}
                  </div>
                </div>
              ))}

            {/* Any extra unknown fields */}
            {extraFields.map(([k, v], i) => (
              <div
                key={k}
                style={{
                  display: 'flex', flexDirection: 'column', gap: '4px',
                  padding: '12px 0',
                  borderTop: '1px solid var(--border-1)',
                }}
              >
                <div className="section-label">{formatKey(k)}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-2)', wordBreak: 'break-word' }}>
                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                </div>
              </div>
            ))}
          </div>

          {/* Recommended pitch */}
          <div style={{ marginTop: '20px', padding: '14px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border-1)' }}>
            <div className="section-label" style={{ marginBottom: '6px' }}>Recommended Pitch</div>
            <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
              {signal.company_name} is actively hiring engineers. This signals budget and growth intent —
              an ideal candidate for <strong style={{ color: 'var(--text-1)', fontWeight: 600 }}>Staff Augmentation</strong> or{' '}
              <strong style={{ color: 'var(--text-1)', fontWeight: 600 }}>Dedicated Dev Team</strong> services.
            </p>
          </div>
        </div>

        {/* Modal footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-1)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          {d.job_url && (
            <a
              href={d.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ padding: '7px 16px', fontSize: '13px', textDecoration: 'none', display: 'inline-block' }}
            >
              View Job Listing
            </a>
          )}
          <button onClick={onClose} className="btn-ghost" style={{ padding: '7px 16px', fontSize: '13px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */
export default function HiringSignalsPage() {
  const [signals, setSignals]       = useState<any[]>([]);
  const [filter, setFilter]         = useState<'ALL' | 'PENDING' | 'ROUTED_TO_CRM'>('ALL');
  const [loading, setLoading]       = useState(true);
  const [activeSignal, setActiveSignal] = useState<any | null>(null);
  const headers = useAuthHeaders();

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/dashboard/signals?type=HIRING_PAIN&limit=100`, { headers })
      .then((r) => r.json())
      .then((d) => setSignals(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? signals : signals.filter((s) => s.status === filter);

  return (
    <>
      {/* Modal */}
      {activeSignal && (
        <SignalModal signal={activeSignal} onClose={() => setActiveSignal(null)} />
      )}

      <div style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div className="section-label" style={{ marginBottom: '8px' }}>Trigger 01</div>
            <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: '26px', color: 'var(--text-1)', letterSpacing: '-0.01em', margin: 0 }}>
              Hiring Signals
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: '13px', marginTop: '4px' }}>
              Companies actively hiring engineers — pitch: Staff Aug &amp; Dev Teams.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            {(['ALL', 'PENDING', 'ROUTED_TO_CRM'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`filter-tab ${filter === f ? 'active' : ''}`}>
                {f === 'ALL' ? `All (${signals.length})` : f === 'ROUTED_TO_CRM' ? 'Routed' : 'Pending'}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { label: 'Total detected',   value: signals.length },
            { label: 'Pending dispatch', value: signals.filter((s) => s.status === 'PENDING').length },
            { label: 'Routed to CRM',    value: signals.filter((s) => s.status === 'ROUTED_TO_CRM').length },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="surface" style={{ borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="live-dot active" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>Signal Feed</span>
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-3)' }}>{filtered.length} records</span>
          </div>

          {loading ? (
            <div style={{ padding: '48px', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--border-2)', borderTopColor: 'var(--text-2)', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
              No signals found. Run <code style={{ fontSize: '12px' }}>python scrapers/hiring_scraper.py</code> to populate.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Domain</th>
                  <th>Position</th>
                  <th>Status</th>
                  <th>Detected</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--text-1)', fontWeight: 500 }}>{s.company_name}</td>
                    <td style={{ fontSize: '11px' }}>
                      <a href={`https://${s.domain}`} target="_blank" rel="noopener noreferrer"
                        style={{ color: 'var(--text-3)', textDecoration: 'none' }}>
                        {s.domain}
                      </a>
                    </td>
                    <td style={{ maxWidth: '200px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {s.signal_details?.job_title || '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${s.status === 'ROUTED_TO_CRM' ? 'badge-success' : 'badge-warn'}`}>
                        {s.status === 'ROUTED_TO_CRM' ? 'Routed' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                      {s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td>
                      <button
                        onClick={() => setActiveSignal(s)}
                        className="btn-ghost"
                        style={{ padding: '4px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
