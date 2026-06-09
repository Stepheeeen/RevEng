import axios from 'axios';

export interface EnrichmentResult {
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
}

/**
 * Uses Hunter.io to find the best contact email for a given domain.
 * Prioritizes C-level/VP roles, then any personal email, then falls back to whatever is available.
 */
export async function enrichDomain(domain: string): Promise<EnrichmentResult> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) return { email: null, first_name: null, last_name: null, position: null };

  try {
    const res = await axios.get(`https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${apiKey}`, { timeout: 5000 });
    
    if (res.data?.data?.emails && res.data.data.emails.length > 0) {
      const emails = res.data.data.emails;
      
      // Try to find an executive or at least a personal email
      let bestEmail = emails.find((e: any) => e.position && /ceo|cto|founder|vp|director|manager/i.test(e.position));
      
      if (!bestEmail) {
        bestEmail = emails.find((e: any) => e.type === 'personal');
      }
      
      if (!bestEmail) {
        bestEmail = emails[0];
      }

      return {
        email: bestEmail.value,
        first_name: bestEmail.first_name,
        last_name: bestEmail.last_name,
        position: bestEmail.position
      };
    }
  } catch (error: any) {
    console.error(`Hunter.io enrichment failed for ${domain}:`, error.message);
  }

  return { email: null, first_name: null, last_name: null, position: null };
}
