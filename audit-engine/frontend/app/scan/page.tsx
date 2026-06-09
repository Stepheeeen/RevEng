'use client';

import React, { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const SCAN_STEPS = [
  'Initializing sandboxed browser instance...',
  'Analyzing server response times & TTFB...',
  'Running performance audit & Core Web Vitals...',
  'Evaluating SEO metadata and crawlability...',
  'Identifying security vulnerabilities & technical debt...',
  'Compiling PDF report...',
  'Finalizing export...',
];

export default function ScanPage() {
  const [email, setEmail]   = useState('');
  const [url, setUrl]       = useState('');
  const [name, setName]     = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [stepIndex, setStepIndex]   = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'scanning') {
      setStepIndex(0); setProgress(0);
      interval = setInterval(() => {
        setStepIndex((prev) => {
          const next = prev < SCAN_STEPS.length - 1 ? prev + 1 : prev;
          setProgress(Math.round(((next + 1) / SCAN_STEPS.length) * 100));
          return next;
        });
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('scanning'); setErrorMessage('');
    try {
      const response = await fetch(`${API}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, url, contactName: name }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Scan failed.');
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const disposition = response.headers.get('Content-Disposition');
      let filename = 'Flair_Audit_Report.pdf';
      const match = disposition && /filename="([^"]+)"/.exec(disposition);
      if (match?.[1]) filename = match[1];
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      setStatus('success');
    } catch (err: any) {
      setErrorMessage(err.message || 'A network error occurred.');
      setStatus('error');
    }
  };

  return (
    <div
      style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Brand */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '12px' }}>
            Flair Technologies
          </div>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: '32px', color: 'var(--text-1)', lineHeight: 1.1, letterSpacing: '-0.01em', margin: 0 }}>
            Free Technical<br />Audit Report
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '13px', lineHeight: 1.6, marginTop: '10px' }}>
            Enter your URL. Get a full Lighthouse performance and security report as a PDF — in under 60 seconds.
          </p>
        </div>

        {/* Card */}
        <div className="surface" style={{ borderRadius: '12px', overflow: 'hidden' }}>
          {status === 'scanning' ? (
            <div style={{ padding: '40px 32px', textAlign: 'center' }}>
              {/* Minimal spinner */}
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--border-2)', borderTopColor: 'var(--text-1)', animation: 'spin 0.8s linear infinite', margin: '0 auto 24px' }} />
              <p style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 600, margin: '0 0 6px' }}>Analyzing Systems</p>
              <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '0 0 20px', minHeight: '18px' }}>
                {SCAN_STEPS[stepIndex]}
              </p>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <p style={{ color: 'var(--text-3)', fontSize: '11px', fontFamily: "'Poppins', sans-serif", marginTop: '8px' }}>{progress}%</p>
            </div>

          ) : status === 'success' ? (
            <div style={{ padding: '40px 32px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-1)', fontSize: '14px', fontWeight: 600, margin: '0 0 6px' }}>Audit Complete</p>
              <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 24px' }}>Your PDF report is downloading.</p>
              <button
                className="btn-secondary"
                onClick={() => { setStatus('idle'); setEmail(''); setUrl(''); setName(''); }}
              >
                Scan another URL
              </button>
            </div>

          ) : (
            <form onSubmit={handleSubmit} style={{ padding: '28px 28px 24px' }}>
              {status === 'error' && (
                <div className="error-box" style={{ marginBottom: '16px' }}>{errorMessage}</div>
              )}

              {[
                { id: 'scan-name',  label: 'Full Name',        type: 'text',  placeholder: 'Jane Doe',           value: name,  onChange: setName,  required: false },
                { id: 'scan-email', label: 'Work Email',       type: 'email', placeholder: 'jane@company.com',   value: email, onChange: setEmail, required: true  },
                { id: 'scan-url',   label: 'Application URL',  type: 'text',  placeholder: 'https://company.com', value: url,   onChange: setUrl,   required: true  },
              ].map((f) => (
                <div key={f.id} style={{ marginBottom: '14px' }}>
                  <label htmlFor={f.id} className="section-label" style={{ display: 'block', marginBottom: '6px' }}>
                    {f.label}
                  </label>
                  <input
                    id={f.id}
                    className="input"
                    type={f.type}
                    required={f.required}
                    placeholder={f.placeholder}
                    value={f.value}
                    onChange={(e) => f.onChange(e.target.value)}
                  />
                </div>
              ))}

              <button id="scan-submit-btn" type="submit" className="btn-primary" style={{ marginTop: '6px' }}>
                Run Audit &amp; Export PDF
              </button>

              <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-3)', marginTop: '14px' }}>
                Corporate emails only · No spam
              </p>
            </form>
          )}
        </div>

        {/* Staff link */}
        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: 'var(--text-3)' }}>
          Staff?{' '}
          <a href="/auth/login" style={{ color: 'var(--text-2)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
            Internal dashboard →
          </a>
        </p>
      </div>
    </div>
  );
}
