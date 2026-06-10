import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { MongoClient } from 'mongodb';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set!");
  const dbName = process.env.MONGODB_DB || 'trinity_db';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  console.log("Dropping collections...");
  const collections = ['companies', 'leads', 'outbound_signals', 'audit_logs', 'raw_scraper_reports'];
  for (const col of collections) {
    try {
      await db.collection(col).deleteMany({});
      console.log(`Cleared collection: ${col}`);
    } catch (e) {
      console.log(`Error clearing ${col}:`, e);
    }
  }

  await client.close();
  console.log("Database cleared successfully.");
}

run().catch(console.error);
