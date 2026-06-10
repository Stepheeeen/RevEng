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
  const domains = companies.map(c => c.domain);
  console.log(`Total companies: ${companies.length}`);
  console.log(`Unique domains: ${new Set(domains).size}`);

  const duplicates = domains.filter((d, i) => domains.indexOf(d) !== i);
  console.log(`Duplicate domains: ${duplicates.join(', ')}`);

  await client.close();
}

run().catch(console.error);
