'use client';

import React, { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function useAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('trinity_token') : null;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export default function AuditLogsPage() {
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const headers = useAuthHeaders();

  useEffect(() => {
    fetch(`${API}/api/dashboard/audits?limit=50`, { headers })
      .then((r) => r.json())
      .then((d) => setAudits(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const avgScore = audits.length > 0
    ? Math.round(audits.reduce((acc, a) => acc + (a.performance_score || 0), 0) / audits.length)
    : 0;

  return (
    <div style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Header */}
      <div>
        <div className="section-label" style={{ marginBottom: '8px' }}>Trigger 03</div>
        <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: '26px', color: 'var(--text-1)', letterSpacing: '-0.01em', margin: 0 }}>
          Audit Logs
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: '13px', marginTop: '4px' }}>
          Inbound scan requests — every company that exposed their technical debt.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {[
          { label: 'Total audits',   value: audits.length },
          { label: 'Avg perf score', value: avgScore, suffix: '/100' },
          { label: 'CRM synced',     value: audits.filter((a) => a.crm_synced).length },
          { label: 'Pending sync',   value: audits.filter((a) => !a.crm_synced).length },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-value">{s.value}{(s as any).suffix || ''}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="surface" style={{ borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="live-dot active" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>Audit Results</span>
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-3)' }}>{audits.length} records</span>
        </div>

        {loading ? (
          <div style={{ padding: '48px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--border-2)', borderTopColor: 'var(--text-2)', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : audits.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
            No audit logs yet.{' '}
            <a href="/scan" target="_blank" style={{ color: 'var(--text-2)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              Submit via public scan →
            </a>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Score</th>
                <th>Company</th>
                <th>URL Scanned</th>
                <th>CRM Sync</th>
                <th>PDF Report</th>
                <th>Generated</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((a) => (
                <tr key={a.id}>
                  <td>
                    <span style={{
                      fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: '13px',
                      color: a.performance_score >= 90 ? 'var(--text-1)' : a.performance_score >= 70 ? 'var(--text-2)' : 'var(--text-2)',
                    }}>
                      {a.performance_score ?? '—'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-1)', fontWeight: 500 }}>{a.company_name}</td>
                  <td style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', maxWidth: '180px' }}>
                    <a href={a.target_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-3)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.target_url?.replace(/^https?:\/\//, '') || a.domain}
                    </a>
                  </td>
                  <td>
                    <span className={`badge ${a.crm_synced ? 'badge-success' : 'badge-warn'}`}>
                      {a.crm_synced ? 'Synced' : 'Pending'}
                    </span>
                  </td>
                  <td>
                    {a.pdf_url ? (
                      <a href={a.pdf_url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '12px', color: 'var(--text-2)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                        Download PDF
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                  <td style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', color: 'var(--text-3)' }}>
                    {a.generated_at ? new Date(a.generated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
