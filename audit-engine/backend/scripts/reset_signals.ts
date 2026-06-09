import dotenv from 'dotenv';
dotenv.config();
import { MongoClient } from 'mongodb';

async function run() {
  const uri = process.env.MONGODB_URI!;
  const dbName = process.env.MONGODB_DB!;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  // Reset all ROUTED signals back to PENDING for a fresh Close dispatch test
  const r = await db.collection('outbound_signals').updateMany(
    { status: 'ROUTED_TO_CRM' },
    { $set: { status: 'PENDING' } }
  );
  console.log(`Reset ${r.modifiedCount} signals to PENDING`);
  await client.close();
}

run().catch(console.error);
