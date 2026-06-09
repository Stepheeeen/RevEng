import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import { getMongoDb } from './src/utils/db';

async function testWebhook() {
  const db = await getMongoDb();
  
  // Find a random lead that has a company domain
  const company = await db.collection('companies').findOne({});
  if (!company) {
    console.log('No companies found in DB to test.');
    process.exit(1);
  }

  const domain = company.domain;
  console.log(`Testing Zoho Webhook against domain: ${domain}`);

  // Fire webhook
  try {
    const res = await axios.post('http://localhost:4000/api/webhook/zoho', {
      domain: domain,
      status: 'Closed Won'
    });

    console.log('Webhook Response:', res.status, res.data);

    // Verify DB
    const updatedSignals = await db.collection('outbound_signals').find({ company_id: company._id, roi_status: 'CLOSED_WON' }).toArray();
    console.log(`Found ${updatedSignals.length} signals marked as CLOSED_WON.`);

    const updatedLeads = await db.collection('leads').find({ company_id: company._id, status: 'CLOSED_WON' }).toArray();
    console.log(`Found ${updatedLeads.length} leads marked as CLOSED_WON.`);

  } catch (error: any) {
    console.error('Test Failed:', error.response?.data || error.message);
  }
  
  process.exit(0);
}

testWebhook();
