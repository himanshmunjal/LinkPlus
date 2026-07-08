-- ============================================================
-- FULL DATABASE RESET & REBUILD
-- Run this in psql when golang-migrate is in a dirty/broken state.
--
-- Usage:
--   psql -U postgres -d URL_Shortner -f fix_db.sql
-- ============================================================

-- Step 1: Wipe everything so we start clean
DROP TABLE IF EXISTS qr_scans       CASCADE;
DROP TABLE IF EXISTS qr_codes       CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS clicks         CASCADE;
DROP TABLE IF EXISTS urls           CASCADE;
DROP TABLE IF EXISTS users          CASCADE;
DROP TABLE IF EXISTS schema_migrations;

-- Step 2: Recreate all tables in dependency order

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    created_at    TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ,
    deleted_at    TIMESTAMPTZ,
    username      TEXT NOT NULL UNIQUE,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user'
);

CREATE TABLE urls (
    id           BIGSERIAL PRIMARY KEY,
    created_at   TIMESTAMPTZ,
    updated_at   TIMESTAMPTZ,
    deleted_at   TIMESTAMPTZ,
    user_id      BIGINT NOT NULL REFERENCES users(id),
    original_url TEXT NOT NULL,
    short_code   TEXT NOT NULL,
    is_qr        BOOLEAN NOT NULL DEFAULT FALSE,
    click_count  BIGINT NOT NULL DEFAULT 0,
    expires_at   TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT urls_short_code_unique UNIQUE (short_code)
);

CREATE TABLE clicks (
    id         BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    url_id     BIGINT REFERENCES urls(id) ON DELETE CASCADE,
    short_code TEXT        NOT NULL DEFAULT '',
    device     TEXT        NOT NULL DEFAULT '',
    clicked_at TIMESTAMPTZ,
    country    TEXT        NOT NULL DEFAULT '',
    region     TEXT        NOT NULL DEFAULT '',
    city       TEXT        NOT NULL DEFAULT '',
    ip_hash    TEXT        NOT NULL DEFAULT ''
);

CREATE TABLE refresh_tokens (
    id         BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked    BOOLEAN NOT NULL DEFAULT FALSE,
    family     TEXT NOT NULL DEFAULT '',
    CONSTRAINT refresh_tokens_hash_unique UNIQUE (token_hash)
);

CREATE TABLE qr_codes (
    id           BIGSERIAL PRIMARY KEY,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ,
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    short_code   TEXT NOT NULL DEFAULT '',
    original_url TEXT NOT NULL,
    label        TEXT NOT NULL DEFAULT '',
    image_path   TEXT NOT NULL DEFAULT '',
    scan_count   BIGINT NOT NULL DEFAULT 0,
    expires_at   TIMESTAMPTZ,
    CONSTRAINT qr_codes_short_code_unique UNIQUE (short_code)
);

CREATE TABLE qr_scans (
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

-- Step 3: Recreate all indexes

-- urls
CREATE UNIQUE INDEX idx_urls_short_code       ON urls (short_code)   WHERE deleted_at IS NULL;
CREATE        INDEX idx_urls_user_id          ON urls (user_id)      WHERE deleted_at IS NULL;
CREATE        INDEX idx_urls_click_count      ON urls (click_count)  WHERE deleted_at IS NULL;
CREATE        INDEX idx_urls_expires_at       ON urls (expires_at)   WHERE expires_at IS NOT NULL AND deleted_at IS NULL;

-- clicks
CREATE INDEX idx_clicks_url_id     ON clicks (url_id)     WHERE deleted_at IS NULL;
CREATE INDEX idx_clicks_short_code ON clicks (short_code) WHERE deleted_at IS NULL;

-- refresh_tokens
CREATE INDEX idx_refresh_tokens_user_id     ON refresh_tokens (user_id)    WHERE deleted_at IS NULL;
CREATE INDEX idx_refresh_tokens_family      ON refresh_tokens (family)     WHERE deleted_at IS NULL;
CREATE INDEX idx_refresh_tokens_hash_active ON refresh_tokens (token_hash) WHERE revoked = FALSE AND deleted_at IS NULL;

-- qr_codes
CREATE INDEX idx_qr_codes_user_id   ON qr_codes (user_id)   WHERE deleted_at IS NULL;
CREATE INDEX idx_qr_codes_expires_at ON qr_codes (expires_at) WHERE expires_at IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_qr_codes_short_code ON qr_codes (short_code) WHERE deleted_at IS NULL;

-- qr_scans
CREATE INDEX idx_qr_scans_qr_id      ON qr_scans (qr_id)      WHERE deleted_at IS NULL;
CREATE INDEX idx_qr_scans_scanned_at ON qr_scans (scanned_at) WHERE deleted_at IS NULL;

-- Step 4: Register all 6 migrations as applied so golang-migrate
--         doesn't try to run them again on next server start.
CREATE TABLE schema_migrations (version BIGINT NOT NULL PRIMARY KEY, dirty BOOLEAN NOT NULL);
INSERT INTO schema_migrations (version, dirty) VALUES (6, false);

SELECT 'All tables created. Start your backend server now.' AS status;