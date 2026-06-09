import { EnrichmentResult } from './hunter';

export interface ScoreBreakdown {
  score: number;
  factors: string[];
}

/**
 * Calculates the Trinity Score (0-100) for a lead based on signal strength and enrichment data.
 */
export function calculateLeadScore(signal: any, enriched: EnrichmentResult | null): ScoreBreakdown {
  let score = 0;
  const factors: string[] = [];

  // 1. Intent / Signal Type (Max 50)
  if (signal.signal_type === 'INBOUND_AUDIT') {
    score += 50;
    factors.push('Inbound Audit Request (+50)');
  } else if (signal.signal_type === 'HIRING_PAIN') {
    score += 30;
    factors.push('Active Tech Hiring (+30)');
  } else if (signal.signal_type === 'LEGACY_TECH') {
    score += 20;
    factors.push('Legacy Infrastructure Detected (+20)');
  }

  // 2. Contact Data / Enrichment (Max 30)
  if (enriched && enriched.position) {
    const title = enriched.position.toLowerCase();
    if (title.includes('ceo') || title.includes('founder') || title.includes('vp') || title.includes('director') || title.includes('chief')) {
      score += 30;
      factors.push('Executive Decision Maker Found (+30)');
    } else if (enriched.first_name) {
      score += 10;
      factors.push('Personalized Contact Found (+10)');
    }
  } else if (enriched && enriched.first_name) {
    score += 10;
    factors.push('Personalized Contact Found (+10)');
  }

  // 3. Signal Depth (Max 20)
  if (signal.signal_type === 'HIRING_PAIN' && signal.signal_details) {
    // If they have been hiring for more than 30 days
    if (signal.signal_details.days_active && signal.signal_details.days_active > 30) {
      score += 10;
      factors.push('Hiring Pain >30 Days (+10)');
    }
    // Note: We could check for multiple roles if the DB structure supports it in the future
  } else if (signal.signal_type === 'LEGACY_TECH' && signal.signal_details) {
    if (signal.signal_details.vulnerabilities && Array.isArray(signal.signal_details.vulnerabilities)) {
      const vulnScore = Math.min(signal.signal_details.vulnerabilities.length * 5, 20);
      if (vulnScore > 0) {
        score += vulnScore;
        factors.push(`Technical Vulnerabilities: ${signal.signal_details.vulnerabilities.length} (+${vulnScore})`);
      }
    }
  }

  // Cap at 100
  score = Math.min(score, 100);

  return { score, factors };
}
