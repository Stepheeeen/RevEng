import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import jwt from 'jsonwebtoken';
import { handleScanRequest } from './controllers/scanController';
import { zohoWebhookHandler } from './controllers/webhookController';
import { initializeDatabase, getMongoDb } from './utils/db';
import { dispatchPendingSignals } from './workers/outboundRouter';
import './workers/outboundRouter';
import { registerScraperCron } from './workers/scraperRunner';
import { ObjectId } from 'mongodb';

const app = express();
const port = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'trinity-secret-change-in-production';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@flairtech.com').toLowerCase();

// ─── CORS ───────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  exposedHeaders: ['Content-Disposition']
}));
app.use(express.json());

// ─── Static Reports ──────────────────────────────────────────────────────────
app.use('/reports', express.static(path.join(__dirname, 'public/reports')));

// ─── Auth Middleware ─────────────────────────────────────────────────────────
function requireAuth(req: any, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req: any, res: express.Response, next: express.NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    next();
  });
}

// ─── Public: Audit Scan ──────────────────────────────────────────────────────
app.post('/api/scan', handleScanRequest);

// ─── Webhooks ────────────────────────────────────────────────────────────────
app.post('/api/webhook/zoho', zohoWebhookHandler);

// ─── Auth Endpoints ──────────────────────────────────────────────────────────

/**
 * POST /api/auth/request
 * Staff enters email → creates a PENDING request, or returns current status.
 * If email is APPROVED, returns a JWT token immediately.
 */
app.post('/api/auth/request', async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'A valid email address is required.' });
    return;
  }

  try {
    const db = await getMongoDb();
    const existing = await db.collection('staff_users').findOne({ email });

    if (existing) {
      if (existing.status === 'APPROVED') {
        // Issue JWT
        const token = jwt.sign(
          { id: existing._id.toString(), email: existing.email, role: existing.role },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        res.json({ status: 'APPROVED', token, role: existing.role, name: existing.name });
        return;
      }
      if (existing.status === 'DENIED') {
        res.json({ status: 'DENIED' });
        return;
      }
      // Still pending
      res.json({ status: 'PENDING' });
      return;
    }

    // New user — create pending entry
    await db.collection('staff_users').insertOne({
      email,
      name: req.body.name?.trim() || null,
      role: 'STAFF',
      status: 'PENDING',
      requested_at: new Date(),
      approved_at: null,
    });

    res.json({ status: 'PENDING' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auth/verify
 * Validates a JWT token and returns the user payload.
 */
app.get('/api/auth/verify', requireAuth, (req: any, res) => {
  res.json({ valid: true, user: req.user });
});

// ─── Admin Endpoints ─────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 * Returns all staff user records. Admin only.
 */
app.get('/api/admin/users', requireAdmin, async (_req, res) => {
  try {
    const db = await getMongoDb();
    const users = await db.collection('staff_users')
      .find({})
      .sort({ requested_at: -1 })
      .toArray();
    res.json(users.map(u => ({
      id: u._id.toString(),
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      requested_at: u.requested_at,
      approved_at: u.approved_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/admin/users/:id/approve
 * Approves a staff user. Admin only.
 */
app.patch('/api/admin/users/:id/approve', requireAdmin, async (req, res) => {
  try {
    const db = await getMongoDb();
    await db.collection('staff_users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: 'APPROVED', approved_at: new Date() } }
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/admin/users/:id/deny
 * Denies a staff user. Admin only.
 */
app.patch('/api/admin/users/:id/deny', requireAdmin, async (req, res) => {
  try {
    const db = await getMongoDb();
    await db.collection('staff_users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: 'DENIED', approved_at: null } }
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Dashboard API Endpoints ─────────────────────────────────────────────────

app.get('/api/dashboard/stats', requireAuth, async (_req, res) => {
  try {
    const db = await getMongoDb();
    const [companies, pending, audits, crmSynced, routed, hiringSignals, legacySignals] = await Promise.all([
      db.collection('companies').countDocuments(),
      db.collection('outbound_signals').countDocuments({ status: 'PENDING' }),
      db.collection('audit_logs').countDocuments(),
      db.collection('audit_logs').countDocuments({ crm_synced: true }),
      db.collection('outbound_signals').countDocuments({ status: 'ROUTED_TO_CRM' }),
      db.collection('outbound_signals').countDocuments({ signal_type: 'HIRING_PAIN' }),
      db.collection('outbound_signals').countDocuments({ signal_type: 'LEGACY_TECH' }),
    ]);
    res.json({ companies, pending, routed, audits, crmSynced, hiringSignals, legacySignals });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/signals', requireAuth, async (req, res) => {
  try {
    const db = await getMongoDb();
    const limit = parseInt(req.query.limit as string) || 50;
    const typeFilter = req.query.type as string;
    const query: any = {};
    if (typeFilter && typeFilter !== 'ALL') query.signal_type = typeFilter;

    const signals = await db.collection('outbound_signals')
      .find(query).sort({ created_at: -1 }).limit(limit).toArray();

    const enriched = await Promise.all(signals.map(async (s) => {
      const company = s.company_id
        ? await db.collection('companies').findOne({ _id: s.company_id })
        : null;
      return {
        id: s._id.toString(),
        signal_type: s.signal_type,
        status: s.status,
        company_name: company?.company_name || 'Unknown',
        domain: company?.domain || 'unknown.com',
        created_at: s.created_at,
        signal_details: s.signal_details,
      };
    }));
    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/audits', requireAuth, async (req, res) => {
  try {
    const db = await getMongoDb();
    const limit = parseInt(req.query.limit as string) || 20;
    const logs = await db.collection('audit_logs')
      .find({}).sort({ generated_at: -1 }).limit(limit).toArray();

    const enriched = await Promise.all(logs.map(async (l) => {
      const company = l.company_id
        ? await db.collection('companies').findOne({ _id: l.company_id })
        : null;
      return {
        id: l._id.toString(),
        company_name: company?.company_name || 'Unknown',
        domain: company?.domain || 'unknown.com',
        target_url: l.target_url,
        performance_score: l.performance_score,
        pdf_url: l.pdf_s3_url,
        crm_synced: l.crm_synced,
        generated_at: l.generated_at,
      };
    }));
    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/dispatch', requireAuth, async (_req, res) => {
  try {
    dispatchPendingSignals().catch((err) => console.error('Dispatch error:', err));
    res.json({ success: true, message: 'CRM dispatch job triggered successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Critical system error occurred' });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await initializeDatabase();

    // Seed admin user if it doesn't exist
    const db = await getMongoDb();
    const adminExists = await db.collection('staff_users').findOne({ email: ADMIN_EMAIL });
    if (!adminExists) {
      await db.collection('staff_users').insertOne({
        email: ADMIN_EMAIL,
        name: 'System Admin',
        role: 'ADMIN',
        status: 'APPROVED',
        requested_at: new Date(),
        approved_at: new Date(),
      });
      console.log(`Admin user seeded: ${ADMIN_EMAIL}`);
    }
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }

  // ─── Zoho OAuth Callback (one-time setup) ──────────────────────────────────
  app.get('/oauth/callback', async (req: any, res: any) => {
    const code = req.query.code as string;
    if (!code) return res.status(400).send('No authorization code received.');

    const clientId     = process.env.ZOHO_CLIENT_ID     || '';
    const clientSecret = process.env.ZOHO_CLIENT_SECRET || '';

    try {
      const params = new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  'http://localhost:4000/oauth/callback',
        code,
      });

      const tokenRes = await fetch(`https://accounts.zoho.com/oauth/v2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data: any = await tokenRes.json();

      if (data.refresh_token) {
        console.log('\n✅ ZOHO REFRESH TOKEN OBTAINED:');
        console.log('ZOHO_REFRESH_TOKEN=' + data.refresh_token);
        console.log('\nAdd this to your .env file and restart the backend.\n');

        res.send(`
          <html><body style="font-family:monospace;padding:40px;background:#080808;color:#f0f0f0">
            <h2 style="color:#f0f0f0">✅ Zoho CRM connected successfully</h2>
            <p>Refresh token obtained. Copy this into your <code>.env</code> file:</p>
            <pre style="background:#1a1a1a;padding:16px;border-radius:8px;border:1px solid #333">ZOHO_REFRESH_TOKEN=${data.refresh_token}</pre>
            <p style="color:#888">You can close this tab. Go back to the terminal and follow the instructions.</p>
          </body></html>
        `);
      } else {
        console.error('Zoho token exchange failed:', data);
        res.status(400).send(`<pre>Token exchange failed:\n${JSON.stringify(data, null, 2)}</pre>`);
      }
    } catch (err: any) {
      console.error('OAuth callback error:', err.message);
      res.status(500).send('OAuth exchange failed: ' + err.message);
    }
  });

  registerScraperCron();
  app.listen(port, () => {
    console.log(`Project Trinity Audit Engine Backend running on port ${port}`);
  });
}

bootstrap();
