-- Add soft-archive support for leads.
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_archived_at
ON leads(archived_at)
WHERE archived_at IS NOT NULL;
