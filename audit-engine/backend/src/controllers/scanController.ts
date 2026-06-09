import { Request, Response } from 'express';
import { runLighthouseScan } from '../utils/lighthouseRunner';
import { generateAuditPdf } from '../utils/pdfGenerator';
import { upsertCompany, createLead, createAuditLog, saveRawAuditDetails, updateAuditLogCrmSyncStatus } from '../utils/db';
import { upsertZohoLead } from '../utils/zoho';
import { enrichDomain } from '../utils/hunter';
import { calculateLeadScore } from '../utils/scoring';
import { URL } from 'url';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// A robust set of non-corporate/public email domains to reject
const BANNED_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'aol.com',
  'icloud.com',
  'mail.com',
  'msn.com',
  'yandex.com',
  'protonmail.com',
  'zoho.com',
  'gmx.com',
]);

/**
 * Validates whether an email belongs to a corporate domain.
 */
function isCorporateEmail(email: string): boolean {
  const domain = email.trim().split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return !BANNED_EMAIL_DOMAINS.has(domain);
}

/**
 * Parses and extracts the base domain from a URL string.
 */
function extractDomain(targetUrl: string): string {
  try {
    const parsed = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch (e) {
    throw new Error('Invalid URL format');
  }
}

export async function handleScanRequest(req: Request, res: Response): Promise<void> {
  const { email, url, contactName } = req.body;

  // 1. Inputs validation
  if (!email || !url) {
    res.status(400).json({ error: 'Work email and Application URL are required.' });
    return;
  }

  if (!isCorporateEmail(email)) {
    res.status(400).json({
      error: 'Please enter a valid work email address (public addresses like @gmail and @yahoo are not accepted).'
    });
    return;
  }

  let domain: string;
  let normalizedUrl: string;
  try {
    domain = extractDomain(url);
    normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
  } catch (err) {
    res.status(400).json({ error: 'The provided URL is invalid.' });
    return;
  }

  try {
    console.log(`Starting scan execution for domain: ${domain} (Target: ${normalizedUrl})`);

    // 2. Run Lighthouse Audit
    const auditResult = await runLighthouseScan(normalizedUrl);

    // 3. PostgreSQL & MongoDB Transactions & Inserts
    // a. Upsert Company
    const companyId = await upsertCompany(domain);
    
    // b. Create Lead
    const name = contactName || 'Valued Client';
    await createLead(companyId, email, name, 'Lead Target');

    // c. Save detailed JSON inside MongoDB (single source of truth for raw scraper/audit reports)
    await saveRawAuditDetails(companyId, normalizedUrl, auditResult.rawReport);

    // d. Generate styled PDF audit
    const pdfBuffer = await generateAuditPdf(normalizedUrl, auditResult);

    // e. Save the PDF report file to local static reports folder (real file serving)
    const reportsDir = path.join(__dirname, '../public/reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    const pdfFilename = `Flair_Audit_Report_${domain}_${Date.now()}.pdf`;
    const pdfFilePath = path.join(reportsDir, pdfFilename);
    fs.writeFileSync(pdfFilePath, pdfBuffer);

    // Generate real downloadable URL served by backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const realPdfUrl = `${backendUrl}/reports/${pdfFilename}`;

    const logId = await createAuditLog(
      companyId,
      normalizedUrl,
      auditResult.performanceScore,
      {
        seo_score: auditResult.seoScore,
        best_practices_score: scoresToText(auditResult.bestPracticesScore),
        vulnerabilities_count: auditResult.failingAudits.length,
        critical_issues: auditResult.failingAudits.slice(0, 5) // Save top 5 issues in MongoDB
      },
      realPdfUrl
    );

    // Asynchronous fire-and-forget CRM dispatch (Trigger 3 — Inbound Audit)
    const CLOSE_API_KEY = process.env.CLOSE_API_KEY || '';
    const companyName   = domain.split('.')[0].replace(/^\w/, (c: string) => c.toUpperCase());
    const activeCrm     = process.env.ACTIVE_CRM || 'close';

    // Enrich the domain
    const enriched = await enrichDomain(domain);
    const contactEmail = enriched.email || email.trim().toLowerCase();
    const contactName = enriched.first_name ? `${enriched.first_name} ${enriched.last_name || ''}`.trim() : name;

    // Build Mock Signal Object for the scoring algorithm
    const mockSignal = {
      signal_type: 'INBOUND_AUDIT',
      signal_details: {
        vulnerabilities: auditResult.failingAudits
      }
    };
    
    // Calculate Trinity Score
    const scoring = calculateLeadScore(mockSignal, enriched);

    let leadDescription = [
      `Trigger: INBOUND_AUDIT`,
      `Pitch:   Automated Audit Engine`,
      `Domain:  ${domain}`,
      ``,
      `Signal Details:`,
      `Performance Score: ${auditResult.performanceScore}/100`,
      `SEO Score:         ${auditResult.seoScore}/100`,
      `Best Practices:    ${scoresToText(auditResult.bestPracticesScore)}`,
      `Audit PDF:         ${realPdfUrl}`,
    ].join('\n');

    let scoreBlock = `[Trinity Score: ${scoring.score}/100]\nFactors: ${scoring.factors.join(', ')}\n\n`;
    if (enriched.position) {
      scoreBlock = `[Enriched Title: ${enriched.position}]\n${scoreBlock}`;
    }
    leadDescription = scoreBlock + leadDescription;

    if (activeCrm === 'zoho') {
      try {
        await upsertZohoLead({
          name: companyName,
          domain: domain,
          url: `https://${domain}`,
          contact_name: contactName,
          email: contactEmail,
          signal_type: 'INBOUND_AUDIT',
          description: leadDescription
        });
        await updateAuditLogCrmSyncStatus(logId, true);
        console.log(`Successfully synced inbound audit for ${domain} to Zoho CRM (Trigger 3).`);
      } catch (err: any) {
        console.error(`Failed to dispatch inbound audit for ${domain} to Zoho CRM:`, err.message);
      }
    } else if (CLOSE_API_KEY) {
      const closeAuth = { Authorization: `Basic ${Buffer.from(`${CLOSE_API_KEY}:`).toString('base64')}`, 'Content-Type': 'application/json' };

      const closePayload = {
        name: companyName,
        url: `https://${domain}`,
        contacts: [
          {
            name: contactName,
            emails: [{ email: contactEmail, type: 'office' }],
          },
        ],
        description: leadDescription,
      };

      axios.post('https://api.close.com/api/v1/lead/', closePayload, { headers: closeAuth, timeout: 5000 })
        .then(async () => {
          await updateAuditLogCrmSyncStatus(logId, true);
          console.log(`Successfully synced inbound audit for ${domain} to Close CRM (Trigger 3).`);
        })
        .catch((err) => {
          console.error(`Failed to dispatch inbound audit for ${domain} to Close CRM:`, err.response?.data || err.message);
        });
    } else {
      console.warn('Neither CLOSE_API_KEY nor ACTIVE_CRM=zoho set — skipping CRM sync for inbound audit.');
    }

    // 4. Return the generated PDF directly for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Flair_Audit_Report_${domain}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
    
    console.log(`Scan completed successfully for ${domain}. PDF generated.`);
  } catch (error: any) {
    console.error('Scan transaction process failed:', error);
    res.status(500).json({
      error: 'An internal error occurred during the systems scan.',
      details: error.message
    });
  }
}

function scoresToText(score: number): string {
  if (score >= 90) return 'GOOD';
  if (score >= 50) return 'NEEDS_IMPROVEMENT';
  return 'POOR';
}
