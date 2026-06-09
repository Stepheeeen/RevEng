'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]   = useState('');
  const [name, setName]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${API}/api/auth/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return; }

      if (data.status === 'APPROVED') {
        localStorage.setItem('trinity_token', data.token);
        localStorage.setItem('trinity_role',  data.role);
        localStorage.setItem('trinity_email', email);
        router.push('/dashboard');
      } else if (data.status === 'PENDING') {
        router.push('/auth/pending');
      } else if (data.status === 'DENIED') {
        setError('Your access has been denied. Contact your administrator.');
      }
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>

        {/* Brand */}
        <div style={{ marginBottom: '36px' }}>
          <div className="section-label" style={{ marginBottom: '12px' }}>Flair Technologies</div>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: '28px', color: 'var(--text-1)', letterSpacing: '-0.01em', margin: 0 }}>
            Staff Access
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '13px', lineHeight: 1.6, marginTop: '8px' }}>
            Enter your email to request access to the Project Trinity dashboard. An administrator will review your request.
          </p>
        </div>

        {/* Form card */}
        <div className="surface" style={{ borderRadius: '12px', padding: '28px' }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="error-box" style={{ marginBottom: '16px' }}>{error}</div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="login-name" className="section-label" style={{ display: 'block', marginBottom: '6px' }}>
                Full Name <span style={{ color: 'var(--text-3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <input id="login-name" className="input" type="text" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="login-email" className="section-label" style={{ display: 'block', marginBottom: '6px' }}>
                Email Address
              </label>
              <input id="login-email" className="input" type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <button id="login-submit-btn" type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Checking access...' : 'Request Access'}
            </button>
          </form>

          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-1)' }}>
            <p style={{ color: 'var(--text-3)', fontSize: '12px', lineHeight: 1.6, margin: 0 }}>
              If you were recently approved, entering your email again will sign you in immediately.
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--text-3)' }}>
          Not staff?{' '}
          <a href="/scan" style={{ color: 'var(--text-2)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
            Use the public audit tool →
          </a>
        </p>
      </div>
    </div>
  );
}
