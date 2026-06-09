'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ─── Nav items — icons KEPT as requested ───────────────────────────────────
const NAV_ITEMS = [
  {
    href: '/dashboard', exact: true, label: 'Overview',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
  },
  {
    href: '/dashboard/hiring', label: 'Hiring Signals', badge: 'T1',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
  },
  {
    href: '/dashboard/legacy', label: 'Legacy Tech', badge: 'T2',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  },
  {
    href: '/dashboard/audits', label: 'Audit Logs', badge: 'T3',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  },
  {
    href: '/dashboard/dispatch', label: 'Mission Control',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />,
  },
];

const ADMIN_NAV = {
  href: '/dashboard/admin', label: 'Admin',
  icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail]   = useState('');
  const [userRole, setUserRole]     = useState('');
  const [verifying, setVerifying]   = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('trinity_token');
    const email = localStorage.getItem('trinity_email');
    const role  = localStorage.getItem('trinity_role');
    if (!token) { router.replace('/auth/login'); return; }

    fetch(`${API}/api/auth/verify`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(() => { setUserEmail(email || ''); setUserRole(role || ''); setVerifying(false); })
      .catch(() => {
        localStorage.clear();
        router.replace('/auth/login');
      });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('trinity_token');
    localStorage.removeItem('trinity_email');
    localStorage.removeItem('trinity_role');
    router.push('/auth/login');
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  if (verifying) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--border-2)', borderTopColor: 'var(--text-2)', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const allNavItems = [...NAV_ITEMS, ...(userRole === 'ADMIN' ? [ADMIN_NAV] : [])];

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo row */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border-1)' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', letterSpacing: '0.02em' }}>Project Trinity</div>
        <div className="section-label" style={{ marginTop: '2px' }}>Intelligence Dashboard</div>
      </div>

      {/* Status */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', gap: '7px' }}>
        <span className="live-dot active" />
        <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Systems operational</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        <div className="section-label" style={{ padding: '0 8px', marginBottom: '8px' }}>Navigation</div>
        {allNavItems.map((item) => {
          const active = isActive(item.href, (item as any).exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`nav-item ${active ? 'active' : ''}`}
              style={{ marginBottom: '2px' }}
            >
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">{item.icon}</svg>
              <span style={{ flex: 1 }}>{item.label}</span>
              {(item as any).badge && (
                <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-3)', fontFamily: "'Poppins', sans-serif" }}>
                  {(item as any).badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User row */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border-1)' }}>
        <div style={{ padding: '8px 10px', background: 'var(--surface-2)', borderRadius: '7px', marginBottom: '4px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
          <div className="section-label" style={{ marginTop: '2px', textTransform: 'lowercase', letterSpacing: 0, fontSize: '10px' }}>{userRole}</div>
        </div>
        <button onClick={handleLogout} className="btn-ghost" style={{ width: '100%', textAlign: 'left', fontSize: '12px' }}>
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Desktop sidebar */}
      <aside className="sidebar-desktop">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} onClick={() => setMobileOpen(false)} />
          <aside style={{ position: 'relative', width: '210px', height: '100%', background: 'var(--surface-1)', borderRight: '1px solid var(--border-1)', display: 'flex', flexDirection: 'column', zIndex: 50 }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="main-content">

        {/* Top bar */}
        <header style={{ position: 'sticky', top: 0, zIndex: 30, background: 'var(--bg)', borderBottom: '1px solid var(--border-1)', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="mobile-trigger"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--text-2)" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div style={{ flex: 1 }} />

          <a href="/scan" target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--text-3)', textDecoration: 'none' }}>
            Public scan ↗
          </a>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: '32px 24px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
