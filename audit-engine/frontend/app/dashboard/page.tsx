'use client';

import React, { useState, useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Stats {
  companies: number; pending: number; routed: number;
  audits: number; crmSynced: number; hiringSignals: number; legacySignals: number;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>();
  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / 900, 1);
      setDisplay(Math.round((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

function useAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('trinity_token') : null;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export default function DashboardOverviewPage() {
  const [stats, setStats]     = useState<Stats | null>(null);
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const headers = useAuthHeaders();

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/dashboard/stats`,          { headers }).then((r) => r.json()),
      fetch(`${API}/api/dashboard/signals?limit=8`, { headers }).then((r) => r.json()),
    ]).then(([s, sig]) => {
      setStats(s);
      setSignals(Array.isArray(sig) ? sig : []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '80px' }}>
        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--border-2)', borderTopColor: 'var(--text-2)', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const STATS = stats ? [
    { label: 'Companies tracked',    value: stats.companies },
    { label: 'Hiring signals',       value: stats.hiringSignals },
    { label: 'Legacy tech signals',  value: stats.legacySignals },
    { label: 'Audits generated',     value: stats.audits },
    { label: 'Signals pending',      value: stats.pending },
    { label: 'Routed to CRM',        value: stats.routed },
    { label: 'CRM confirmed',        value: stats.crmSynced },
    { label: 'Pipeline health',      value: stats.routed > 0 ? Math.round((stats.crmSynced / stats.routed) * 100) : 0, suffix: '%' },
  ] : [];

  const SIGNAL_LABELS: Record<string, string> = {
    HIRING_PAIN:   'Hiring Pain',
    LEGACY_TECH:   'Legacy Tech',
    INBOUND_AUDIT: 'Inbound Audit',
  };

  return (
    <div style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: '26px', color: 'var(--text-1)', letterSpacing: '-0.01em', margin: 0 }}>
          Overview
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: '13px', marginTop: '4px' }}>
          Real-time metrics across all three acquisition triggers.
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {STATS.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-value">
              <AnimatedNumber value={s.value} />{(s as any).suffix || ''}
            </div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Signal pipeline bars */}
      {stats && (
        <div>
          <div className="divider" style={{ marginBottom: '20px' }} />
          <div className="section-label" style={{ marginBottom: '16px' }}>Signal Pipeline</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { label: 'Trigger 1 — Hiring Pain',       value: stats.hiringSignals, total: Math.max(stats.hiringSignals, 1), href: '/dashboard/hiring' },
              { label: 'Trigger 2 — Legacy Tech',       value: stats.legacySignals, total: Math.max(stats.legacySignals, 1), href: '/dashboard/legacy' },
              { label: 'Trigger 3 — Inbound Audits',   value: stats.audits,         total: Math.max(stats.audits, 1),        href: '/dashboard/audits' },
            ].map((bar) => (
              <a key={bar.label} href={bar.href} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>{bar.label}</span>
                  <span style={{ fontSize: '12px', fontFamily: "'Poppins', sans-serif", color: 'var(--text-1)' }}>{bar.value}</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: '100%', opacity: 0.6 }} />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Recent signals */}
      <div>
        <div className="divider" style={{ marginBottom: '20px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="section-label">Recent Signals</div>
          <a href="/dashboard/hiring" style={{ fontSize: '12px', color: 'var(--text-3)', textDecoration: 'none' }}>View all →</a>
        </div>

        {signals.length === 0 ? (
          <p style={{ color: 'var(--text-3)', fontSize: '13px' }}>No signals yet. Run the scrapers to populate data.</p>
        ) : (
          <div className="surface" style={{ borderRadius: '10px', overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Company</th>
                  <th>Domain</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="badge badge-muted">{SIGNAL_LABELS[s.signal_type] || s.signal_type}</span>
                    </td>
                    <td style={{ color: 'var(--text-1)', fontWeight: 500 }}>{s.company_name}</td>
                    <td style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', color: 'var(--text-3)' }}>{s.domain}</td>
                    <td>
                      <span className={`badge ${s.status === 'ROUTED_TO_CRM' ? 'badge-success' : 'badge-warn'}`}>
                        {s.status === 'ROUTED_TO_CRM' ? 'Routed' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', color: 'var(--text-3)' }}>
                      {s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
