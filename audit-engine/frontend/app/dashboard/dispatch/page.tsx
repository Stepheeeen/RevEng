'use client';

import React, { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function useAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('trinity_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Stats {
  companies: number; pending: number; routed: number;
  audits: number; crmSynced: number; hiringSignals: number; legacySignals: number;
}

export default function DispatchPage() {
  const [stats, setStats]         = useState<Stats | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [result, setResult]       = useState<{ success: boolean; message: string } | null>(null);
  const [log, setLog]             = useState<string[]>([]);
  const headers = useAuthHeaders();

  useEffect(() => {
    fetch(`${API}/api/dashboard/stats`, { headers })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const handleDispatch = async () => {
    setDispatching(true);
    setResult(null);
    const ts = new Date().toLocaleTimeString();
    setLog((prev) => [`[${ts}] Initiating CRM dispatch job...`, ...prev]);

    try {
      const res  = await fetch(`${API}/api/dispatch`, { method: 'POST', headers });
      const data = await res.json();
      setResult({ success: data.success, message: data.message || data.error });
      const ts2 = new Date().toLocaleTimeString();
      setLog((prev) => [`[${ts2}] ✓ ${data.message || 'Dispatch triggered.'}`, ...prev]);
      fetch(`${API}/api/dashboard/stats`, { headers }).then((r) => r.json()).then(setStats).catch(() => {});
    } catch {
      setResult({ success: false, message: 'Connection error — is the backend running?' });
      const ts2 = new Date().toLocaleTimeString();
      setLog((prev) => [`[${ts2}] ✗ Connection error`, ...prev]);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Header */}
      <div>
        <div className="section-label" style={{ marginBottom: '8px' }}>CRM Router</div>
        <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: '26px', color: 'var(--text-1)', letterSpacing: '-0.01em', margin: 0 }}>
          Mission Control
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: '13px', marginTop: '4px' }}>
          Dispatch pending signals to CRM. Cron fires daily at 08:00 — or trigger manually.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { label: 'Pending',        value: stats.pending },
            { label: 'Routed',         value: stats.routed },
            { label: 'CRM confirmed',  value: stats.crmSynced },
            { label: 'Total signals',  value: stats.hiringSignals + stats.legacySignals },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="divider" />

      {/* Control panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Dispatch block */}
        <div className="surface" style={{ borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '4px' }}>Manual Dispatch</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="live-dot active" />
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>CRM router online</span>
            </div>
          </div>

          <p style={{ color: 'var(--text-3)', fontSize: '12px', lineHeight: 1.6, margin: 0 }}>
            Processes all <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', color: 'var(--text-2)' }}>PENDING</span> signals and dispatches them to the connected CRM endpoint. Non-blocking — returns instantly.
          </p>

          <button
            id="dispatch-btn"
            onClick={handleDispatch}
            disabled={dispatching}
            className="btn-primary"
          >
            {dispatching ? 'Dispatching...' : 'Dispatch All Pending Signals'}
          </button>

          {result && (
            <div
              className="error-box"
              style={{ color: result.success ? 'var(--text-2)' : 'var(--text-2)' }}
            >
              {result.success ? '✓' : '✗'} {result.message}
            </div>
          )}
        </div>

        {/* Cron info block */}
        <div className="surface" style={{ borderRadius: '10px', padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '16px' }}>Cron Schedule</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { label: 'Expression',       value: '0 8 * * *' },
              { label: 'Next run',         value: 'Tomorrow 08:00' },
              { label: 'Timeout',          value: '5000ms / signal' },
              { label: 'Retry strategy',   value: 'crm_synced fallback' },
            ].map(({ label, value }, i, arr) => (
              <div
                key={label}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border-1)' : 'none',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{label}</span>
                <span style={{ fontSize: '11px', fontFamily: "'Poppins', sans-serif", color: 'var(--text-2)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity log */}
      <div className="surface" style={{ borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>Activity Log</span>
          <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: "'Poppins', sans-serif" }}>session only</span>
        </div>
        <div style={{
          padding: '12px 16px', fontFamily: "'Poppins', sans-serif", fontSize: '11px',
          minHeight: '100px', maxHeight: '180px', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '2px',
        }}>
          {log.length === 0 ? (
            <span style={{ color: 'var(--text-3)' }}>Waiting for dispatch events...</span>
          ) : (
            log.map((l, i) => (
              <div
                key={i}
                style={{ color: l.includes('✓') ? 'var(--text-2)' : l.includes('✗') ? 'var(--text-2)' : 'var(--text-3)' }}
              >
                {l}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
