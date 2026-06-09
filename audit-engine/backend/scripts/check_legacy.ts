import dotenv from 'dotenv';
dotenv.config();
import { MongoClient } from 'mongodb';

async function run() {
  const uri = process.env.MONGODB_URI!;
  const dbName = process.env.MONGODB_DB!;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  
  const legacy = await db.collection('outbound_signals').find({ signal_type: 'LEGACY_TECH' }).toArray();
  for (const sig of legacy) {
    const comp = await db.collection('companies').findOne({ _id: sig.company_id });
    console.log(`Legacy Tech Signal for: ${comp ? comp.domain : 'Unknown'} - Status: ${sig.status}`);
  }
  await client.close();
}

run().catch(console.error);
