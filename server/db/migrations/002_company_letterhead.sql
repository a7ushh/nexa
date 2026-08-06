-- ---------------------------------------------------------------------------
-- 002_company_letterhead.sql
--
-- The printed challan carries the company's letterhead - address and contact
-- numbers under the name - and the party's address beneath their name. The
-- party address already lives on `masters`; these columns add the company half.
--
-- Additive only: existing rows keep working with the fields left blank.
-- ---------------------------------------------------------------------------

ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone   TEXT;
