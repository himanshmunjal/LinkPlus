-- Run this once directly in psql to fix the existing database.
-- After running this, restart the backend — migration 000006 will create qr_scans automatically.

-- Step 1: Add scan_count to qr_codes if it doesn't already exist
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS scan_count BIGINT NOT NULL DEFAULT 0;

-- Step 2: Create the qr_scans table (same as migration 000006, run manually here
--         because your DB is already past that migration version)
CREATE TABLE IF NOT EXISTS qr_scans (
    id         BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    qr_id      BIGINT NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    device     TEXT NOT NULL DEFAULT '',
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    country    TEXT NOT NULL DEFAULT '',
    region     TEXT NOT NULL DEFAULT '',
    city       TEXT NOT NULL DEFAULT '',
    ip_hash    TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_id
    ON qr_scans (qr_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at
    ON qr_scans (scanned_at)
    WHERE deleted_at IS NULL;

-- Step 3: Tell golang-migrate that version 6 is already applied
--         so it doesn't try to re-run it on next startup
UPDATE schema_migrations SET version = 6, dirty = false;

SELECT 'Done. Restart your backend server now.' AS status;