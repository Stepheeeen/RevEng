import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

export interface AuditResult {
  performanceScore: number;
  seoScore: number;
  bestPracticesScore: number;
  failingAudits: Array<{
    id: string;
    title: string;
    description: string;
    score: number | null;
    displayValue?: string;
  }>;
  rawReport: any;
}

/**
 * Runs a headless Lighthouse audit on a target URL focusing on Performance, SEO, and Best Practices.
 */
export async function runLighthouseScan(targetUrl: string): Promise<AuditResult> {
  let chrome: chromeLauncher.LaunchedChrome | null = null;
  
  try {
    // Launch Chrome headlessly with production flags
    chrome = await chromeLauncher.launch({
      chromeFlags: [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    const options = {
      logLevel: 'info' as const,
      output: 'json' as const,
      onlyCategories: ['performance', 'seo', 'best-practices'],
      port: chrome.port,
    };

    // Run Lighthouse
    const runnerResult = await lighthouse(targetUrl, options);
    if (!runnerResult || !runnerResult.lhr) {
      throw new Error('Lighthouse returned empty audit results.');
    }

    const { lhr } = runnerResult;

    // Retrieve categories scores
    const performanceScore = Math.round((lhr.categories.performance?.score || 0) * 100);
    const seoScore = Math.round((lhr.categories.seo?.score || 0) * 100);
    const bestPracticesScore = Math.round((lhr.categories['best-practices']?.score || 0) * 100);

    // Identify failing audits (where score is below 0.9 / 90%)
    const failingAudits: AuditResult['failingAudits'] = [];
    for (const [key, audit] of Object.entries(lhr.audits)) {
      if (audit.score !== null && audit.score < 0.9) {
        failingAudits.push({
          id: key,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          displayValue: audit.displayValue,
        });
      }
    }

    return {
      performanceScore,
      seoScore,
      bestPracticesScore,
      failingAudits,
      rawReport: lhr,
    };
  } catch (error: any) {
    console.error(`Lighthouse scan failed for ${targetUrl}:`, error);
    throw new Error(`Audit run failed: ${error.message}`);
  } finally {
    if (chrome) {
      await chrome.kill();
    }
  }
}
