'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function useAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('trinity_token') : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

interface StaffUser {
  id: string; email: string; name: string | null;
  role: string; status: 'PENDING' | 'APPROVED' | 'DENIED';
  requested_at: string; approved_at: string | null;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers]           = useState<StaffUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [actionId, setActionId]     = useState<string | null>(null);
  const [error, setError]           = useState('');
  const headers = useAuthHeaders();

  const fetchUsers = () => {
    setLoading(true);
    fetch(`${API}/api/admin/users`, { headers })
      .then((r) => {
        if (r.status === 403) { router.replace('/dashboard'); return null; }
        return r.json();
      })
      .then((d) => { if (d) setUsers(d); })
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAction = async (id: string, action: 'approve' | 'deny') => {
    setActionId(id + action);
    setError('');
    try {
      const res = await fetch(`${API}/api/admin/users/${id}/${action}`, { method: 'PATCH', headers });
      if (!res.ok) throw new Error();
      await fetchUsers();
    } catch {
      setError(`Failed to ${action} user.`);
    } finally {
      setActionId(null);
    }
  };

  const pendingCount = users.filter((u) => u.status === 'PENDING').length;

  return (
    <div style={{ maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div className="section-label">Admin</div>
            {pendingCount > 0 && (
              <span className="badge badge-white" style={{ animation: 'pulse-dot 2s ease-in-out infinite' }}>
                {pendingCount} pending
              </span>
            )}
          </div>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: '26px', color: 'var(--text-1)', letterSpacing: '-0.01em', margin: 0 }}>
            Access Control
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '13px', marginTop: '4px' }}>
            Approve or deny access requests for the Project Trinity dashboard.
          </p>
        </div>
        <button onClick={fetchUsers} className="btn-secondary" style={{ flexShrink: 0, marginTop: '4px' }}>
          Refresh
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {/* Users list */}
      <div className="surface" style={{ borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>Access Requests</span>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{users.length} total</span>
        </div>

        {loading ? (
          <div style={{ padding: '48px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--border-2)', borderTopColor: 'var(--text-2)', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
            No access requests yet.
          </div>
        ) : (
          <div>
            {users.map((user, i) => {
              const isLoading = actionId?.startsWith(user.id);
              return (
                <div
                  key={user.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '14px 20px',
                    borderBottom: i < users.length - 1 ? '1px solid var(--border-1)' : 'none',
                  }}
                >
                  {/* Avatar letter */}
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '6px', flexShrink: 0,
                    background: 'var(--surface-2)', border: '1px solid var(--border-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 600, color: 'var(--text-2)',
                    fontFamily: "'Poppins', sans-serif",
                  }}>
                    {user.email.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.email}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
                      {user.name || 'No name'} · {user.role}
                      {user.requested_at && ` · ${new Date(user.requested_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                    </div>
                  </div>

                  {/* Status */}
                  <span className={`badge ${
                    user.status === 'APPROVED' ? 'badge-success'
                    : user.status === 'PENDING'  ? 'badge-white'
                    : 'badge-muted'
                  }`}
                    style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    {user.status === 'PENDING' && <span className="live-dot active" style={{ width: '5px', height: '5px' }} />}
                    {user.status === 'APPROVED' ? 'Approved' : user.status === 'PENDING' ? 'Pending' : 'Denied'}
                  </span>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    {user.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleAction(user.id, 'approve')}
                          disabled={!!isLoading}
                          className="btn-secondary"
                          style={{ padding: '5px 12px', fontSize: '12px' }}
                        >
                          {isLoading && actionId === user.id + 'approve' ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleAction(user.id, 'deny')}
                          disabled={!!isLoading}
                          className="btn-ghost"
                          style={{ padding: '5px 12px', fontSize: '12px' }}
                        >
                          {isLoading && actionId === user.id + 'deny' ? '...' : 'Deny'}
                        </button>
                      </>
                    )}

                    {user.status === 'APPROVED' && (
                      <button
                        onClick={() => handleAction(user.id, 'deny')}
                        disabled={!!isLoading}
                        className="btn-ghost"
                        style={{ padding: '5px 12px', fontSize: '12px' }}
                      >
                        {isLoading ? '...' : 'Revoke'}
                      </button>
                    )}

                    {user.status === 'DENIED' && (
                      <button
                        onClick={() => handleAction(user.id, 'approve')}
                        disabled={!!isLoading}
                        className="btn-ghost"
                        style={{ padding: '5px 12px', fontSize: '12px' }}
                      >
                        {isLoading ? '...' : 'Re-approve'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info block */}
      <div className="surface" style={{ borderRadius: '10px', padding: '16px 20px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>How access works</div>
        <p style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.7, margin: 0 }}>
          When a staff member visits{' '}
          <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', color: 'var(--text-2)' }}>/auth/login</span>
          {' '}and submits their email, a request appears here with <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px' }}>PENDING</span> status.
          Approving grants instant access the next time they sign in.
          The super-admin is configured via the{' '}
          <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', color: 'var(--text-2)' }}>ADMIN_EMAIL</span>
          {' '}environment variable and is auto-approved on server boot.
        </p>
      </div>
    </div>
  );
}
