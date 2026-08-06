-- ---------------------------------------------------------------------------
-- 003_damage_loss.sql
--
-- Receive challans tracked `damaged` and `loss` separately. They are always
-- deducted together, so they become one `damage_loss` column and the amount
-- rule becomes (pieces - damage_loss) * rate.
--
-- Existing rows are preserved as the sum. The split between the two is not
-- recoverable afterwards, which is the point of combining them; the pre-merge
-- values remain visible in record_revisions, whose snapshots are JSON.
-- ---------------------------------------------------------------------------

ALTER TABLE receive_challans
  ADD COLUMN IF NOT EXISTS damage_loss NUMERIC(12,2) NOT NULL DEFAULT 0;

UPDATE receive_challans
   SET damage_loss = COALESCE(damaged, 0) + COALESCE(loss, 0)
 WHERE damage_loss = 0
   AND (COALESCE(damaged, 0) + COALESCE(loss, 0)) > 0;

ALTER TABLE receive_challans DROP COLUMN IF EXISTS damaged;
ALTER TABLE receive_challans DROP COLUMN IF EXISTS loss;

ALTER TABLE receive_challans
  ADD CONSTRAINT receive_challans_damage_loss_non_negative CHECK (damage_loss >= 0);
