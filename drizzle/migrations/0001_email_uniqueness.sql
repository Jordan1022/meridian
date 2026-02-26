-- Normalize email values and enforce case-insensitive uniqueness for non-null emails.
UPDATE leads
SET email = NULL
WHERE email IS NOT NULL
  AND btrim(email) = '';

UPDATE leads
SET email = lower(btrim(email))
WHERE email IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT lower(email) AS normalized_email, count(*) AS duplicate_count
      FROM leads
      WHERE email IS NOT NULL
      GROUP BY lower(email)
      HAVING count(*) > 1
    ) duplicates
  ) THEN
    RAISE EXCEPTION 'Cannot create unique email index: duplicate lead emails exist.';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email_unique_ci
ON leads (lower(email))
WHERE email IS NOT NULL;
