-- ---------------------------------------------------------------------------
-- 006_drop_drive_refresh_token.sql
--
-- Backups no longer keep a Google Drive credential. Root grants Drive access
-- afresh for each backup, and the access token lives only on the session for
-- that one upload (services/backupService.js).
--
-- So the stored refresh token has no reader left. Dropping the column destroys
-- every copy still held - including one that expired and is now useless, and
-- one that may still be live.
--
-- Deleting it here does not withdraw a still-live grant at Google itself; that
-- is done from the Google account's "Third-party apps with account access" page.
-- ---------------------------------------------------------------------------

ALTER TABLE users DROP COLUMN IF EXISTS refresh_token;
