-- Project Trinity Database Schema (PostgreSQL)
-- Single source of truth for Flair Technologies' acquisition ecosystem.

-- Enable extension for UUID generation if needed (gen_random_uuid is standard in Pg 13+)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom Types & Enums
CREATE TYPE outbound_signal_type AS ENUM ('HIRING_PAIN', 'LEGACY_TECH');
CREATE TYPE outbound_signal_status AS ENUM ('PENDING', 'ROUTED_TO_CRM');

-- Helper function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. COMPANIES TABLE
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain VARCHAR(255) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    funding_status VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for fast case-insensitive domain lookup
CREATE UNIQUE INDEX idx_companies_domain_lower ON companies (LOWER(domain));

-- Trigger for auto-updating updated_at on companies
CREATE TRIGGER trigger_update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. LEADS TABLE
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contact_name VARCHAR(255) NOT NULL,
    title VARCHAR(150),
    email VARCHAR(255) NOT NULL UNIQUE,
    is_corporate_email BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for leads
CREATE INDEX idx_leads_company_id ON leads (company_id);
CREATE UNIQUE INDEX idx_leads_email_lower ON leads (LOWER(email));

-- Trigger for auto-updating updated_at on leads
CREATE TRIGGER trigger_update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. AUDIT LOGS TABLE
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    target_url TEXT NOT NULL,
    performance_score INTEGER CHECK (performance_score >= 0 AND performance_score <= 100),
    critical_vulnerabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
    pdf_s3_url TEXT,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX idx_audit_logs_company_id ON audit_logs (company_id);
CREATE INDEX idx_audit_logs_generated_at ON audit_logs (generated_at DESC);
-- GIN Index for fast searching inside critical_vulnerabilities JSONB data
CREATE INDEX idx_audit_logs_vulnerabilities ON audit_logs USING gin (critical_vulnerabilities);

-- 4. OUTBOUND SIGNALS TABLE
CREATE TABLE outbound_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    signal_type outbound_signal_type NOT NULL,
    signal_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    status outbound_signal_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for outbound signals
CREATE INDEX idx_outbound_signals_company_id ON outbound_signals (company_id);
CREATE INDEX idx_outbound_signals_status ON outbound_signals (status);
-- GIN Index for fast querying on signals metadata / scraped data
CREATE INDEX idx_outbound_signals_details ON outbound_signals USING gin (signal_details);

-- Trigger for auto-updating updated_at on outbound_signals
CREATE TRIGGER trigger_update_outbound_signals_updated_at
    BEFORE UPDATE ON outbound_signals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
