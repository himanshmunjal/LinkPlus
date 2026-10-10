-- qr_codes: each QR is backed by a hidden short URL (urls.is_qr = TRUE).
-- The QR image encodes BASE_URL/r/<short_code>, so scans resolve through the
-- redirect pipeline and are logged to qr_scans (000006).

CREATE TABLE IF NOT EXISTS qr_codes (
    id           BIGSERIAL PRIMARY KEY,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ,
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    short_code   TEXT   NOT NULL DEFAULT '',
    original_url TEXT   NOT NULL,
    label        TEXT   NOT NULL DEFAULT '',
    image_path   TEXT   NOT NULL DEFAULT '',
    scan_count   BIGINT NOT NULL DEFAULT 0,
    expires_at   TIMESTAMPTZ,
    CONSTRAINT qr_codes_short_code_unique UNIQUE (short_code)
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id
    ON qr_codes (user_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_qr_codes_short_code
    ON qr_codes (short_code)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_qr_codes_expires_at
    ON qr_codes (expires_at)
    WHERE expires_at IS NOT NULL AND deleted_at IS NULL;
