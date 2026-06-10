import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { MongoClient } from 'mongodb';

async function run() {
  const uri = process.env.MONGODB_URI!;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'trinity_db');

  const companies = await db.collection('companies').find().toArray();
  console.log(`Total companies: ${companies.length}`);

  const hiringSignals = await db.collection('outbound_signals').find({ signal_type: 'HIRING_PAIN' }).toArray();
  console.log(`Total HIRING_PAIN signals: ${hiringSignals.length}`);
  
  const legacySignals = await db.collection('outbound_signals').find({ signal_type: 'LEGACY_TECH' }).toArray();
  console.log(`Total LEGACY_TECH signals: ${legacySignals.length}`);

  console.log("Hiring signal companies:");
  hiringSignals.forEach(s => console.log(s.company_id, s.signal_details.job_title));

  await client.close();
}

run().catch(console.error);
