-- Initial migration for Pipeline Brain

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create stage enum
CREATE TYPE stage AS ENUM ('New', 'Qualified', 'Call_Scheduled', 'Proposal_Sent', 'Negotiation', 'Won', 'Lost');

-- Create channel enum
CREATE TYPE channel AS ENUM ('email', 'call', 'text', 'dm', 'meeting', 'other');

-- Create leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  source TEXT,
  stage stage NOT NULL DEFAULT 'New',
  value INTEGER,
  notes TEXT,
  last_touch_at TIMESTAMPTZ,
  next_action TEXT,
  next_action_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create touches table
CREATE TABLE touches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel channel NOT NULL DEFAULT 'other',
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create users table (single user for bootstrap)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create OpenClaw tokens table
CREATE TABLE openclaw_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_hash TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_next_action_at ON leads(next_action_at) WHERE next_action_at IS NOT NULL;
CREATE INDEX idx_touches_lead_id ON touches(lead_id);
CREATE INDEX idx_touches_created_at ON touches(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for leads
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
