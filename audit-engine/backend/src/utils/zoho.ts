import axios from 'axios';

let _accessToken = '';
let _tokenExpiresAt = 0;

export async function getZohoAccessToken(): Promise<string> {
  if (_accessToken && Date.now() < _tokenExpiresAt) {
    return _accessToken;
  }

  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
  const dc = process.env.ZOHO_DC || 'com';

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Zoho CRM credentials in environment variables.');
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken
  });

  try {
    const res = await axios.post(`https://accounts.zoho.${dc}/oauth/v2/token`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 5000,
    });

    if (res.data.access_token) {
      _accessToken = res.data.access_token;
      // Token usually expires in 3600 seconds, set it to 3500 to be safe
      _tokenExpiresAt = Date.now() + (res.data.expires_in - 100) * 1000;
      return _accessToken;
    } else {
      throw new Error(`Failed to refresh Zoho token: ${JSON.stringify(res.data)}`);
    }
  } catch (error: any) {
    throw new Error(`Error fetching Zoho token: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
  }
}

/**
 * Creates a Lead in Zoho CRM, or updates if one already exists for the domain.
 */
export async function upsertZohoLead(payload: any): Promise<boolean> {
  const dc = process.env.ZOHO_DC || 'com';
  const accessToken = await getZohoAccessToken();
  const headers = {
    Authorization: `Zoho-oauthtoken ${accessToken}`,
    'Content-Type': 'application/json'
  };

  const domain = payload.domain;

  // Search for existing lead by domain
  // Using Zoho COQL query or search API. For simplicity we'll use search
  let existingLeadId: string | null = null;
  
  if (domain) {
    try {
      const searchRes = await axios.get(
        `https://www.zohoapis.${dc}/crm/v3/Leads/search?criteria=(Website:equals:https://${domain})`,
        { headers, timeout: 5000 }
      );
      
      if (searchRes.data?.data && searchRes.data.data.length > 0) {
        existingLeadId = searchRes.data.data[0].id;
      }
    } catch (err: any) {
      // 204 No Content is expected if no leads found
      if (err.response?.status !== 204) {
        console.error('Error searching Zoho leads:', err.response?.data || err.message);
      }
    }
  }

  if (existingLeadId) {
    // Fetch existing description to append to it
    let existingDesc = '';
    try {
      const getRes = await axios.get(`https://www.zohoapis.${dc}/crm/v3/Leads/${existingLeadId}`, { headers, timeout: 5000 });
      existingDesc = getRes.data?.data?.[0]?.Description || '';
    } catch (e: any) {
      console.error('Could not fetch existing lead description', e.message);
    }

    const updatePayload = {
      data: [
        {
          id: existingLeadId,
          Description: existingDesc 
            ? `${existingDesc}\n\n--- Project Trinity Update (${new Date().toLocaleDateString('en-GB')}) ---\n${payload.description}`
            : payload.description
        }
      ]
    };

    await axios.put(
      `https://www.zohoapis.${dc}/crm/v3/Leads`,
      updatePayload,
      { headers, timeout: 5000 }
    );
    console.log(`Updated existing Zoho lead for ${domain} (${existingLeadId})`);
  } else {
    // Create new lead
    const leadPayload = {
      data: [
        {
          Company: payload.name,
          Last_Name: payload.contact_name || 'Decision Maker',
          Email: payload.email,
          Website: payload.url,
          Description: payload.description,
          Lead_Source: payload.signal_type
        }
      ]
    };

    await axios.post(
      `https://www.zohoapis.${dc}/crm/v3/Leads`,
      leadPayload,
      { headers, timeout: 5000 }
    );
    console.log(`Created new Zoho lead for ${domain}`);
  }

  return true;
}
