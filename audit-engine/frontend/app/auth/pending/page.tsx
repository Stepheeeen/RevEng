'use client';

import React from 'react';
import Link from 'next/link';

export default function PendingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}>

        <div className="section-label" style={{ marginBottom: '24px' }}>Access Request</div>

        <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: '28px', color: 'var(--text-1)', letterSpacing: '-0.01em', margin: '0 0 10px' }}>
          Awaiting Approval
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: '13px', lineHeight: 1.6, margin: '0 0 32px' }}>
          Your request has been submitted and is under review by a system administrator. Once approved, return here and sign in with your email.
        </p>

        {/* Status steps */}
        <div className="surface" style={{ borderRadius: '10px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
          {[
            { step: 'Email submitted', done: true },
            { step: 'Under admin review', done: false, active: true },
            { step: 'Access granted', done: false },
          ].map((s, i) => (
            <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--border-1)' : 'none' }}>
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                border: '1px solid var(--border-2)',
                background: s.done ? 'var(--text-1)' : s.active ? 'var(--surface-2)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {s.done && <span style={{ color: '#000', fontSize: '10px', fontWeight: 600 }}>✓</span>}
                {s.active && <span className="live-dot active" style={{ width: '6px', height: '6px' }} />}
              </div>
              <span style={{ fontSize: '13px', color: s.done ? 'var(--text-1)' : s.active ? 'var(--text-2)' : 'var(--text-3)' }}>
                {s.step}
              </span>
            </div>
          ))}
        </div>

        <Link href="/auth/login" className="btn-secondary" style={{ display: 'inline-block' }}>
          Check again
        </Link>

        <p style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-3)' }}>
          Need immediate access? Contact your administrator directly.
        </p>
      </div>
    </div>
  );
}
