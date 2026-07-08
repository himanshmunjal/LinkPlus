-- qr_scans: dedicated table for QR scan events.
-- Analytics queries join qr_scans → qr_codes via qr_id (FK).
-- This keeps QR scan data separate from URL click data.

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