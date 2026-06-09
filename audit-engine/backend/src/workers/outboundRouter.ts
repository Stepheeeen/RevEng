import cron from 'node-cron';
import axios from 'axios';
import { getMongoDb } from '../utils/db';
import { upsertZohoLead } from '../utils/zoho';
import { enrichDomain } from '../utils/hunter';
import { calculateLeadScore } from '../utils/scoring';

const CLOSE_API_KEY = process.env.CLOSE_API_KEY || '';
const CLOSE_API_BASE = 'https://api.close.com/api/v1';

// Basic auth header for Close CRM (API key as username, empty password)
function closeAuth() {
  const encoded = Buffer.from(`${CLOSE_API_KEY}:`).toString('base64');
  return { Authorization: `Basic ${encoded}`, 'Content-Type': 'application/json' };
}

/**
 * Maps a signal to a human-readable Close Lead payload.
 */
function buildCloseLead(signal: any, company: any, lead: any, enriched: any) {
  const companyName = company?.company_name || signal.company_name || 'Unknown Company';
  const domain      = company?.domain       || signal.domain       || 'unknown.com';
  
  // Use enriched data if available, otherwise fallback to lead data, otherwise fallback to generic
  const contactName = enriched?.first_name ? `${enriched.first_name} ${enriched.last_name || ''}`.trim() : (lead?.contact_name || 'Decision Maker');
  const contactEmail= enriched?.email || lead?.email || `sales@${domain}`;

  const pitchMap: Record<string, string> = {
    HIRING_PAIN:   'Staff Aug / Dev Teams',
    LEGACY_TECH:   'System Modernization',
    INBOUND_AUDIT: 'Automated Audit Engine',
  };
  const pitch = pitchMap[signal.signal_type] || signal.signal_type;

  // Build a human-readable note from signal details
  let detailNote = '';
  const d = signal.signal_details || {};
  if (signal.signal_type === 'HIRING_PAIN') {
    detailNote = [
      d.job_title    ? `Role: ${d.job_title}`                     : null,
      d.days_active  ? `Listing age: ${d.days_active} days`       : null,
      d.job_url      ? `Job URL: ${d.job_url}`                    : null,
      d.scraper_source ? `Source: ${d.scraper_source}`            : null,
    ].filter(Boolean).join('\n');
  } else if (signal.signal_type === 'LEGACY_TECH') {
    const vulns: any[] = d.vulnerabilities || [];
    detailNote = vulns.map((v: any) =>
      `• ${v.technology}${v.version ? ` v${v.version}` : ''}: ${v.description || v.issue_type}`
    ).join('\n');
    if (d.total_issues) detailNote = `Total issues: ${d.total_issues}\n` + detailNote;
  } else if (signal.signal_type === 'INBOUND_AUDIT') {
    detailNote = [
      d.performance_score != null ? `Performance Score: ${d.performance_score}/100` : null,
      d.pdf_url            ? `Audit PDF: ${d.pdf_url}`                              : null,
    ].filter(Boolean).join('\n');
  }

  return {
    name: companyName,
    url:  `https://${domain}`,
    contacts: [
      {
        name: contactName,
        emails: [{ email: contactEmail, type: 'office' }],
      },
    ],
    // Close custom fields (free-text notes since custom fields require prior setup)
    description: [
      `Trigger: ${signal.signal_type}`,
      `Pitch:   ${pitch}`,
      `Domain:  ${domain}`,
      detailNote ? `\nSignal Details:\n${detailNote}` : '',
    ].filter(Boolean).join('\n'),
  };
}

/**
 * Creates a Lead in Close CRM, or updates if one already exists for the domain.
 */
async function upsertCloseLead(payload: ReturnType<typeof buildCloseLead>): Promise<boolean> {
  // Search for existing lead by URL/domain first
  const searchRes = await axios.get(
    `${CLOSE_API_BASE}/lead/?query=${encodeURIComponent(`url:"${payload.url}"`)}`,
    { headers: closeAuth(), timeout: 5000 }
  );

  const existing = searchRes.data?.data?.[0];

  if (existing) {
    // Update existing lead with a new note instead of duplicating
    await axios.post(
      `${CLOSE_API_BASE}/activity/note/`,
      {
        lead_id: existing.id,
        note: `[Project Trinity — ${new Date().toLocaleDateString('en-GB')}]\n${payload.description}`,
      },
      { headers: closeAuth(), timeout: 5000 }
    );
    console.log(`Updated existing Close lead for ${payload.url} (${existing.id})`);
  } else {
    // Create new lead
    await axios.post(`${CLOSE_API_BASE}/lead/`, payload, {
      headers: closeAuth(),
      timeout: 5000,
    });
    console.log(`Created new Close lead for ${payload.url}`);
  }

  return true;
}

/**
 * Dispatches all PENDING signals to Close CRM and marks them ROUTED_TO_CRM.
 */
export async function dispatchPendingSignals(): Promise<void> {
  const activeCrm = process.env.ACTIVE_CRM || 'close';
  
  if (activeCrm === 'close' && !CLOSE_API_KEY) {
    console.error('CLOSE_API_KEY is not set. Cannot dispatch signals.');
    return;
  }

  console.log('Starting Outbound CRM Routing job → Close CRM...');

  try {
    const db = await getMongoDb();
    const pendingSignals = await db.collection('outbound_signals').find({ status: 'PENDING' }).toArray();

    if (pendingSignals.length === 0) {
      console.log('No pending signals found to route.');
      return;
    }

    console.log(`Routing ${pendingSignals.length} signal(s) to Close CRM...`);

    for (const signal of pendingSignals) {
      const company = await db.collection('companies').findOne({ _id: signal.company_id });
      const lead    = await db.collection('leads').findOne({ company_id: signal.company_id });

      try {
        const domain = company?.domain || signal.domain || 'unknown.com';
        
        // Enrich the domain via Hunter.io before sending to CRM
        const enriched = await enrichDomain(domain);
        
        // Calculate Trinity Score
        const scoring = calculateLeadScore(signal, enriched);
        
        const payload = buildCloseLead(signal, company, lead, enriched);

        const activeCrm = process.env.ACTIVE_CRM || 'close';

        if (activeCrm === 'zoho') {
          // Add extra fields expected by Zoho helper
          const zohoPayload = {
            ...payload,
            domain,
            email: enriched?.email || lead?.email || `sales@${domain}`,
            contact_name: enriched?.first_name ? `${enriched.first_name} ${enriched.last_name || ''}`.trim() : (lead?.contact_name || 'Decision Maker'),
            signal_type: signal.signal_type,
          };
          
          let scoreBlock = `[Trinity Score: ${scoring.score}/100]\nFactors: ${scoring.factors.join(', ')}\n\n`;
          if (enriched?.position) {
            scoreBlock = `[Enriched Title: ${enriched.position}]\n${scoreBlock}`;
          }
          zohoPayload.description = scoreBlock + zohoPayload.description;
          
          await upsertZohoLead(zohoPayload);
        } else {
          // Add score to Close description if using close
          payload.description = `[Trinity Score: ${scoring.score}/100]\nFactors: ${scoring.factors.join(', ')}\n\n` + payload.description;
          await upsertCloseLead(payload);
        }

        await db.collection('outbound_signals').updateOne(
          { _id: signal._id },
          { $set: { status: 'ROUTED_TO_CRM', updated_at: new Date() } }
        );
      } catch (err: any) {
        console.error(`Failed to route signal ${signal._id} to ${process.env.ACTIVE_CRM}:`, err.response?.data || err.message);
        // Leave as PENDING — sweep cron will retry
      }
    }

    console.log('CRM dispatch batch complete.');
  } catch (error) {
    console.error('Critical error in CRM dispatch job:', error);
  }
}

// Daily 8:00 AM cron
cron.schedule('0 8 * * *', async () => {
  console.log('Daily 8:00 AM Cron Triggered.');
  await dispatchPendingSignals();
});

console.log('Outbound CRM Router Cron Worker registered successfully (Daily 8:00 AM schedule).');
