import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { MongoClient } from 'mongodb';

async function run() {
  const uri = process.env.MONGODB_URI!;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'trinity_db');

  const lumin = await db.collection('companies').find({ company_name: "Lumin Digital" }).toArray();
  console.log("Lumin Digital companies:", JSON.stringify(lumin, null, 2));

  if (lumin.length > 0) {
    const signals = await db.collection('outbound_signals').find({ company_id: lumin[0]._id }).toArray();
    console.log("Signals for Lumin Digital:", JSON.stringify(signals, null, 2));
  }

  await client.close();
}

run().catch(console.error);
