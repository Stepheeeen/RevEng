import puppeteer from 'puppeteer';
import { AuditResult } from './lighthouseRunner';

/**
 * Generates a highly stylized, branded PDF report based on Lighthouse audit results.
 */
export async function generateAuditPdf(
  targetUrl: string,
  scores: AuditResult
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Map failing audits into HTML list items
    const failingItemsHtml = scores.failingAudits
      .map(
        (audit) => `
        <div class="card error-card">
          <div class="card-header">
            <span class="badge badge-error">Failed</span>
            <h3>${audit.title}</h3>
          </div>
          <p class="card-description">${audit.description}</p>
          ${
            audit.displayValue
              ? `<div class="card-metric">Measured Value: <span>${audit.displayValue}</span></div>`
              : ''
          }
        </div>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            color: #1e293b;
            background-color: #f8fafc;
            padding: 40px;
            line-height: 1.5;
            -webkit-print-color-adjust: exact;
          }

          /* Header Styling */
          header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
            margin-bottom: 40px;
          }

          .brand-logo {
            font-family: 'Outfit', sans-serif;
            font-size: 24px;
            font-weight: 800;
            background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .report-tag {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.1em;
          }

          /* Hero Details */
          .hero-details {
            margin-bottom: 40px;
          }

          .hero-details h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 32px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 8px;
          }

          .target-url {
            display: inline-block;
            font-family: monospace;
            background: #e2e8f0;
            padding: 6px 12px;
            border-radius: 6px;
            color: #334155;
            font-size: 14px;
          }

          /* Metrics Dashboard Grid */
          .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 50px;
          }

          .metric-box {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
          }

          .metric-title {
            font-size: 14px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 15px;
          }

          .metric-circle {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            margin: 0 auto 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-family: 'Outfit', sans-serif;
            font-weight: 800;
            color: white;
          }

          .metric-pass {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          }

          .metric-average {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          }

          .metric-fail {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          }

          /* Sections */
          section h2 {
            font-family: 'Outfit', sans-serif;
            font-size: 22px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 20px;
            border-left: 4px solid #4f46e5;
            padding-left: 10px;
          }

          /* Error Cards */
          .error-list {
            display: flex;
            flex-direction: column;
            gap: 15px;
          }

          .card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 1px 3px rgb(0 0 0 / 0.05);
          }

          .card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
          }

          .badge {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 3px 8px;
            border-radius: 9999px;
            color: white;
          }

          .badge-error {
            background: #ef4444;
          }

          .card-header h3 {
            font-size: 16px;
            font-weight: 700;
            color: #1e293b;
          }

          .card-description {
            font-size: 14px;
            color: #475569;
            margin-bottom: 12px;
          }

          .card-metric {
            font-size: 12px;
            font-weight: 600;
            color: #64748b;
          }

          .card-metric span {
            color: #dc2626;
            font-family: monospace;
          }

          /* Footer */
          footer {
            margin-top: 60px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
          }
        </style>
        <title>Flair Technologies Audit Report</title>
      </head>
      <body>
        <header>
          <div class="brand-logo">Flair Technologies</div>
          <div class="report-tag">Technical Audit</div>
        </header>

        <main>
          <div class="hero-details">
            <h1>Site Performance & Debt Scan</h1>
            <div class="target-url">${targetUrl}</div>
          </div>

          <div class="dashboard-grid">
            <div class="metric-box">
              <div class="metric-title">Performance</div>
              <div class="metric-circle ${
                scores.performanceScore >= 90
                  ? 'metric-pass'
                  : scores.performanceScore >= 50
                  ? 'metric-average'
                  : 'metric-fail'
              }">
                ${scores.performanceScore}
              </div>
            </div>
            
            <div class="metric-box">
              <div class="metric-title">Best Practices</div>
              <div class="metric-circle ${
                scores.bestPracticesScore >= 90
                  ? 'metric-pass'
                  : scores.bestPracticesScore >= 50
                  ? 'metric-average'
                  : 'metric-fail'
              }">
                ${scores.bestPracticesScore}
              </div>
            </div>

            <div class="metric-box">
              <div class="metric-title">SEO</div>
              <div class="metric-circle ${
                scores.seoScore >= 90
                  ? 'metric-pass'
                  : scores.seoScore >= 50
                  ? 'metric-average'
                  : 'metric-fail'
              }">
                ${scores.seoScore}
              </div>
            </div>
          </div>

          <section>
            <h2>Identified Architectural Vulnerabilities & Code Debt</h2>
            <div class="error-list">
              ${failingItemsHtml || '<div class="card"><p>No critical performance or debt warnings identified.</p></div>'}
            </div>
          </section>
        </main>

        <footer>
          &copy; ${new Date().getFullYear()} Flair Technologies. This report was automatically compiled by Project Trinity.
        </footer>
      </body>
      </html>
    `;

    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
    
    // Generate PDF file buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px',
      },
    });

    return pdfBuffer;
  } catch (error: any) {
    console.error('Puppeteer PDF generation failed:', error);
    throw new Error(`PDF creation failed: ${error.message}`);
  } finally {
    await browser.close();
  }
}
