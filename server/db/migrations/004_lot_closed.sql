-- ---------------------------------------------------------------------------
-- 004_lot_closed.sql
--
-- A grey lot now leaves the floor when it is finished rather than when it is
-- old: age no longer decides the section (see utils/sections.js).
--
-- "Finished" is usually every piece back from handwork, which is computed. But
-- plenty of lots only ever go to embroidery and would otherwise sit in
-- In Progress forever, so somebody can also close one by hand once nothing is
-- outstanding. That judgement has to be stored - it cannot be derived.
--
-- Additive only: existing lots have both columns null and are unaffected.
-- ---------------------------------------------------------------------------

ALTER TABLE grey_lots ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE grey_lots ADD COLUMN IF NOT EXISTS closed_by BIGINT REFERENCES users (id);
