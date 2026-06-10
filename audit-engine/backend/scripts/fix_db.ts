import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { MongoClient } from 'mongodb';

async function run() {
  const uri = process.env.MONGODB_URI!;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'trinity_db');

  console.log("Removing duplicate signals...");
  
  // Clean up HIRING_PAIN duplicates
  const hiringSignals = await db.collection('outbound_signals').find({ signal_type: 'HIRING_PAIN' }).toArray();
  const seenHiring = new Set();
  for (const s of hiringSignals) {
    const key = `${s.company_id}_${s.signal_details.job_title}`;
    if (seenHiring.has(key)) {
      await db.collection('outbound_signals').deleteOne({ _id: s._id });
      console.log(`Deleted duplicate HIRING_PAIN for company ${s.company_id}`);
    } else {
      seenHiring.add(key);
    }
  }

  // Clean up LEGACY_TECH duplicates
  const legacySignals = await db.collection('outbound_signals').find({ signal_type: 'LEGACY_TECH' }).toArray();
  const seenLegacy = new Set();
  for (const s of legacySignals) {
    const key = `${s.company_id}_LEGACY_TECH`;
    if (seenLegacy.has(key)) {
      await db.collection('outbound_signals').deleteOne({ _id: s._id });
      console.log(`Deleted duplicate LEGACY_TECH for company ${s.company_id}`);
    } else {
      seenLegacy.add(key);
    }
  }

  console.log("Creating unique indexes to prevent this permanently...");
  await db.collection('companies').createIndex({ domain: 1 }, { unique: true });
  
  // Create a unique index for HIRING_PAIN signals
  await db.collection('outbound_signals').createIndex(
    { company_id: 1, signal_type: 1, "signal_details.job_title": 1 },
    { unique: true, partialFilterExpression: { signal_type: "HIRING_PAIN" } }
  );

  // Create a unique index for LEGACY_TECH signals
  await db.collection('outbound_signals').createIndex(
    { company_id: 1, signal_type: 1 },
    { unique: true, partialFilterExpression: { signal_type: "LEGACY_TECH" } }
  );

  console.log("Database fixed and constraints applied!");
  await client.close();
}

run().catch(console.error);
