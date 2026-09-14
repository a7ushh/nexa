-- ---------------------------------------------------------------------------
-- 005_challan_chart.sql
--
-- Issue and receive challans, embroidery and handwork alike, now carry the
-- chart the goods were cut to - the same field a grey lot already has. The
-- issue form prefills it from the lot, the receive form from the issue, and it
-- prints on the challan when any row has one.
--
-- Additive only: existing challans keep a null chart, which reads as blank and
-- drops out of the printed table. Nothing is backfilled from the lot, so a
-- challan printed before and after this migration looks the same.
-- ---------------------------------------------------------------------------

ALTER TABLE issue_challans   ADD COLUMN IF NOT EXISTS chart TEXT;
ALTER TABLE receive_challans ADD COLUMN IF NOT EXISTS chart TEXT;
