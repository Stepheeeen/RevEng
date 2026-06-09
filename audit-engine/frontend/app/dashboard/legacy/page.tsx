'use client';

import React, { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function useAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('trinity_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const ISSUE_LABELS: Record<string, string> = {
  OUTDATED_ECOMMERCE:   'Outdated E-Commerce',
  LEGACY_PHP:           'Legacy PHP',
  LEGACY_CMS:           'Legacy CMS',
  DEPRECATED_FRAMEWORK: 'Deprecated Framework',
};

/* ─── Legacy Tech Details Modal ─────────────────────────────────────────────── */
function LegacyModal({ signal, onClose }: { signal: any; onClose: () => void }) {
  const d = signal.signal_details || {};
  const vulnerabilities: any[] = d.vulnerabilities || [];

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
          width: '100%', maxWidth: '520px',
          background: 'var(--surface-1)',
          border: '1px solid var(--border-2)',
          borderRadius: '12px',
          overflow: 'hidden',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <div className="section-label" style={{ marginBottom: '4px' }}>Legacy Tech Signal</div>
            <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-1)' }}>{signal.company_name}</div>
            <a href={`https://${signal.domain}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '12px', color: 'var(--text-3)', textDecoration: 'none' }}>
              {signal.domain}
            </a>
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '20px', lineHeight: 1, padding: '0 0 0 16px', flexShrink: 0 }}>
            ×
          </button>
        </div>

        {/* Body — scrollable */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

          {/* Status + date */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <span className={`badge ${signal.status === 'ROUTED_TO_CRM' ? 'badge-success' : 'badge-warn'}`}>
              {signal.status === 'ROUTED_TO_CRM' ? 'Routed to CRM' : 'Pending Dispatch'}
            </span>
            {signal.created_at && (
              <span className="badge badge-muted">
                Detected {new Date(signal.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
            {d.total_issues != null && (
              <span className="badge badge-muted">
                {d.total_issues} issue{d.total_issues !== 1 ? 's' : ''} found
              </span>
            )}
          </div>

          {/* Vulnerability list */}
          {vulnerabilities.length > 0 ? (
            <div>
              <div className="section-label" style={{ marginBottom: '12px' }}>Vulnerabilities Detected</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {vulnerabilities.map((vuln, i) => (
                  <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: '8px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-1)' }}>
                        {vuln.technology || 'Unknown Technology'}
                      </span>
                      {vuln.version && (
                        <span className="badge badge-muted">v{vuln.version}</span>
                      )}
                    </div>

                    {vuln.issue_type && (
                      <div style={{ marginBottom: '6px' }}>
                        <span className="badge badge-white">{ISSUE_LABELS[vuln.issue_type] || vuln.issue_type}</span>
                      </div>
                    )}

                    {vuln.description && (
                      <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '8px 0 0', lineHeight: 1.6 }}>
                        {vuln.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>No vulnerability breakdown available.</div>
          )}

          {/* Recommended pitch */}
          <div style={{ marginTop: '20px', padding: '14px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border-1)' }}>
            <div className="section-label" style={{ marginBottom: '6px' }}>Recommended Pitch</div>
            <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
              {signal.company_name} is running{' '}
              {vulnerabilities.length > 0
                ? vulnerabilities.map((v) => v.technology).join(', ')
                : 'outdated technology'}{' '}
              that is{' '}
              {vulnerabilities.some((v) => v.issue_type === 'OUTDATED_ECOMMERCE') ? 'end-of-life and a significant security liability' : 'no longer actively maintained'}.
              Position Flair as the team to lead a full{' '}
              <strong style={{ color: 'var(--text-1)', fontWeight: 600 }}>System Modernization</strong> engagement.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-1)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '7px 16px', fontSize: '13px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */
export default function LegacyTechPage() {
  const [signals, setSignals]         = useState<any[]>([]);
  const [filter, setFilter]           = useState('ALL');
  const [loading, setLoading]         = useState(true);
  const [activeSignal, setActiveSignal] = useState<any | null>(null);
  const headers = useAuthHeaders();

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/dashboard/signals?type=LEGACY_TECH&limit=100`, { headers })
      .then((r) => r.json())
      .then((d) => setSignals(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const issueTypes = ['ALL', ...Array.from(new Set(
    signals.flatMap((s) => (s.signal_details?.vulnerabilities || []).map((v: any) => v.issue_type)).filter(Boolean)
  ))];

  const filtered = filter === 'ALL'
    ? signals
    : signals.filter((s) =>
        (s.signal_details?.vulnerabilities || []).some((v: any) => v.issue_type === filter)
      );

  return (
    <>
      {activeSignal && (
        <LegacyModal signal={activeSignal} onClose={() => setActiveSignal(null)} />
      )}

      <div style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div className="section-label" style={{ marginBottom: '8px' }}>Trigger 02</div>
            <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: '26px', color: 'var(--text-1)', letterSpacing: '-0.01em', margin: 0 }}>
              Legacy Tech
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: '13px', marginTop: '4px' }}>
              Domains running outdated infrastructure — pitch: System Modernization.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flexShrink: 0, maxWidth: '300px', justifyContent: 'flex-end' }}>
            {issueTypes.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`filter-tab ${filter === f ? 'active' : ''}`}>
                {f === 'ALL' ? `All (${signals.length})` : (ISSUE_LABELS[f] || f)}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { label: 'Total signals',   value: signals.length },
            { label: 'Pending',         value: signals.filter((s) => s.status === 'PENDING').length },
            { label: 'Routed to CRM',  value: signals.filter((s) => s.status === 'ROUTED_TO_CRM').length },
            { label: 'Unique domains', value: new Set(signals.map((s) => s.domain)).size },
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
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>Vulnerability Tracker</span>
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-3)' }}>{filtered.length} records</span>
          </div>

          {loading ? (
            <div style={{ padding: '48px', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--border-2)', borderTopColor: 'var(--text-2)', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
              No signals. Run <code style={{ fontSize: '12px' }}>python scrapers/tech_analyzer.py</code>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Domain</th>
                  <th>Technology</th>
                  <th>Issues</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const vulns: any[] = s.signal_details?.vulnerabilities || [];
                  const primaryVuln = vulns[0];
                  return (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text-1)', fontWeight: 500 }}>{s.company_name}</td>
                      <td style={{ fontSize: '11px' }}>
                        <a href={`https://${s.domain}`} target="_blank" rel="noopener noreferrer"
                          style={{ color: 'var(--text-3)', textDecoration: 'none' }}>
                          {s.domain}
                        </a>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                        {primaryVuln?.technology || '—'}
                        {primaryVuln?.version ? ` v${primaryVuln.version}` : ''}
                      </td>
                      <td>
                        <span className="badge badge-muted">
                          {s.signal_details?.total_issues ?? vulns.length} issue{(s.signal_details?.total_issues ?? vulns.length) !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${s.status === 'ROUTED_TO_CRM' ? 'badge-success' : 'badge-warn'}`}>
                          {s.status === 'ROUTED_TO_CRM' ? 'Routed' : 'Pending'}
                        </span>
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
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
