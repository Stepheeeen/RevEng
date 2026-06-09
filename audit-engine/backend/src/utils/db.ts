import { MongoClient, Db, ObjectId } from 'mongodb';

// MongoDB Connection Configuration
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;

export async function getMongoDb(): Promise<Db> {
  if (mongoDb) return mongoDb;
  mongoClient = new MongoClient(mongoUri, {
    maxPoolSize: 20,
    connectTimeoutMS: 5000,
  });
  await mongoClient.connect();
  mongoDb = mongoClient.db(process.env.MONGODB_DB || 'project_trinity');
  return mongoDb;
}

/**
 * Upserts a company into MongoDB based on domain.
 */
export async function upsertCompany(domain: string, companyName?: string): Promise<string> {
  const normalizedDomain = domain.trim().toLowerCase();
  const calculatedName = companyName || normalizedDomain.split('.')[0].replace(/^\w/, (c) => c.toUpperCase());
  const db = await getMongoDb();
  
  await db.collection('companies').updateOne(
    { domain: normalizedDomain },
    {
      $setOnInsert: {
        domain: normalizedDomain,
        company_name: calculatedName,
        funding_status: 'UNKNOWN',
        created_at: new Date()
      },
      $set: {
        updated_at: new Date()
      }
    },
    { upsert: true }
  );
  
  const doc = await db.collection('companies').findOne({ domain: normalizedDomain });
  if (!doc) throw new Error('Failed to upsert company');
  return doc._id.toString();
}

/**
 * Inserts or updates a Lead in MongoDB linked to a company.
 */
export async function createLead(companyId: string, email: string, name: string, title?: string): Promise<string> {
  const db = await getMongoDb();
  const normalizedEmail = email.trim().toLowerCase();
  
  await db.collection('leads').updateOne(
    { email: normalizedEmail },
    {
      $setOnInsert: {
        company_id: new ObjectId(companyId),
        email: normalizedEmail,
        is_corporate_email: true,
        created_at: new Date()
      },
      $set: {
        contact_name: name,
        title: title || 'Other',
        updated_at: new Date()
      }
    },
    { upsert: true }
  );
  
  const doc = await db.collection('leads').findOne({ email: normalizedEmail });
  if (!doc) throw new Error('Failed to create lead');
  return doc._id.toString();
}

/**
 * Creates a structured audit log entry in MongoDB.
 */
export async function createAuditLog(
  companyId: string,
  targetUrl: string,
  performanceScore: number,
  criticalVulnerabilities: any,
  pdfS3Url?: string
): Promise<string> {
  const db = await getMongoDb();
  const logDoc = {
    company_id: new ObjectId(companyId),
    target_url: targetUrl,
    performance_score: performanceScore,
    critical_vulnerabilities: criticalVulnerabilities,
    pdf_s3_url: pdfS3Url || null,
    crm_synced: false,
    generated_at: new Date()
  };
  
  const result = await db.collection('audit_logs').insertOne(logDoc);
  return result.insertedId.toString();
}

/**
 * Updates the CRM sync status of an audit log entry.
 */
export async function updateAuditLogCrmSyncStatus(
  logId: string,
  synced: boolean
): Promise<void> {
  const db = await getMongoDb();
  await db.collection('audit_logs').updateOne(
    { _id: new ObjectId(logId) },
    { $set: { crm_synced: synced } }
  );
}

/**
 * Persists raw, un-truncated Lighthouse JSON data in MongoDB.
 */
export async function saveRawAuditDetails(
  companyId: string,
  targetUrl: string,
  rawLighthouseReport: any
): Promise<void> {
  const db = await getMongoDb();
  await db.collection('audit_details').insertOne({
    company_id: new ObjectId(companyId),
    target_url: targetUrl,
    lighthouse_raw_report: rawLighthouseReport,
    scanned_at: new Date(),
    metadata: {
      scanner_agent: 'Project Trinity Audit Engine v1.0',
      environment: process.env.NODE_ENV || 'development'
    }
  });
}

/**
 * Setup/Initializes database collections and indexes.
 */
export async function initializeDatabase(): Promise<void> {
  const db = await getMongoDb();
  await db.collection('companies').createIndex({ domain: 1 }, { unique: true });
  await db.collection('leads').createIndex({ email: 1 }, { unique: true });
  await db.collection('leads').createIndex({ company_id: 1 });
  await db.collection('audit_logs').createIndex({ company_id: 1 });
  await db.collection('audit_logs').createIndex({ generated_at: -1 });
  await db.collection('outbound_signals').createIndex({ company_id: 1 });
  await db.collection('outbound_signals').createIndex({ status: 1 });
  await db.collection('outbound_signals').createIndex({ signal_type: 1 });
  await db.collection('audit_details').createIndex({ company_id: 1 });
  await db.collection('audit_details').createIndex({ scanned_at: -1 });
  await db.collection('raw_scraper_payloads').createIndex({ company_id: 1 });
  await db.collection('raw_scraper_payloads').createIndex({ source: 1, payload_type: 1 });
  // Staff users (email-only auth)
  await db.collection('staff_users').createIndex({ email: 1 }, { unique: true });
  console.log('Project Trinity MongoDB Collections and Indexes Initialized Successfully.');
}
