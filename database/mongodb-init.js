/**
 * Project Trinity - MongoDB Initialization Script (MongoDB-Only Architecture)
 * 
 * Sets up collections, validation schemas, and indexes for all application features.
 */

// Select database
db = db.getSiblingDB('project_trinity');

// Helper to drop collections if they already exist (re-runnable script)
const collections = ['companies', 'leads', 'audit_logs', 'outbound_signals', 'audit_details', 'raw_scraper_payloads'];
collections.forEach(col => {
  if (db.getCollectionNames().indexOf(col) !== -1) {
    db.getCollection(col).drop();
  }
});

// 1. COMPANIES COLLECTION
db.createCollection('companies', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['domain', 'company_name', 'funding_status', 'created_at', 'updated_at'],
      properties: {
        domain: {
          bsonType: 'string',
          description: 'Unique website domain (e.g. flair.com)'
        },
        company_name: {
          bsonType: 'string',
          description: 'Full name of the company'
        },
        funding_status: {
          bsonType: 'string',
          description: 'Current funding status (e.g. SERIES_A, UNKNOWN)'
        },
        created_at: { bsonType: 'date' },
        updated_at: { bsonType: 'date' }
      }
    }
  }
});
db.companies.createIndex({ domain: 1 }, { unique: true });

// 2. LEADS COLLECTION
db.createCollection('leads', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['company_id', 'contact_name', 'email', 'is_corporate_email', 'created_at', 'updated_at'],
      properties: {
        company_id: {
          bsonType: 'objectId',
          description: 'Reference to the company in companies collection'
        },
        contact_name: { bsonType: 'string' },
        title: { bsonType: 'string' },
        email: {
          bsonType: 'string',
          description: 'Unique corporate email address'
        },
        is_corporate_email: { bsonType: 'bool' },
        created_at: { bsonType: 'date' },
        updated_at: { bsonType: 'date' }
      }
    }
  }
});
db.leads.createIndex({ email: 1 }, { unique: true });
db.leads.createIndex({ company_id: 1 });

// 3. AUDIT LOGS COLLECTION
db.createCollection('audit_logs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['company_id', 'target_url', 'performance_score', 'critical_vulnerabilities', 'generated_at'],
      properties: {
        company_id: { bsonType: 'objectId' },
        target_url: { bsonType: 'string' },
        performance_score: { bsonType: 'int' },
        critical_vulnerabilities: { bsonType: 'object' },
        pdf_s3_url: { bsonType: ['string', 'null'] },
        generated_at: { bsonType: 'date' }
      }
    }
  }
});
db.audit_logs.createIndex({ company_id: 1 });
db.audit_logs.createIndex({ generated_at: -1 });

// 4. OUTBOUND SIGNALS COLLECTION
db.createCollection('outbound_signals', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['company_id', 'signal_type', 'signal_details', 'status', 'created_at', 'updated_at'],
      properties: {
        company_id: { bsonType: 'objectId' },
        signal_type: {
          enum: ['HIRING_PAIN', 'LEGACY_TECH'],
          description: 'Type of outbound intelligence signal'
        },
        signal_details: { bsonType: 'object' },
        status: {
          enum: ['PENDING', 'ROUTED_TO_CRM'],
          description: 'Routing state for CRM processing'
        },
        created_at: { bsonType: 'date' },
        updated_at: { bsonType: 'date' }
      }
    }
  }
});
db.outbound_signals.createIndex({ company_id: 1 });
db.outbound_signals.createIndex({ status: 1 });
db.outbound_signals.createIndex({ signal_type: 1 });

// 5. AUDIT DETAILS COLLECTION
db.createCollection('audit_details', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['company_id', 'target_url', 'lighthouse_raw_report', 'scanned_at'],
      properties: {
        company_id: {
          bsonType: 'objectId',
          description: 'Reference to companies collection'
        },
        target_url: { bsonType: 'string' },
        lighthouse_raw_report: { bsonType: 'object' },
        scanned_at: { bsonType: 'date' },
        metadata: { bsonType: 'object' }
      }
    }
  }
});
db.audit_details.createIndex({ company_id: 1 });
db.audit_details.createIndex({ scanned_at: -1 });

// 6. RAW SCRAPER PAYLOADS COLLECTION
db.createCollection('raw_scraper_payloads', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['company_id', 'source', 'payload_type', 'raw_payload', 'scraped_at'],
      properties: {
        company_id: { bsonType: 'objectId' },
        source: {
          enum: ['linkedin', 'indeed', 'builtwith']
        },
        payload_type: {
          enum: ['job_posting', 'tech_stack']
        },
        raw_payload: { bsonType: 'object' },
        scraped_at: { bsonType: 'date' }
      }
    }
  }
});
db.raw_scraper_payloads.createIndex({ company_id: 1 });
db.raw_scraper_payloads.createIndex({ source: 1, payload_type: 1 });

print("Project Trinity MongoDB Collections and Indexes Initialized Successfully for MongoDB-Only Architecture.");
