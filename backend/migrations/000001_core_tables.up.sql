-- Core tables: users, urls, clicks
-- is_qr on urls from the start so QR-backed short codes never appear on the Links page.

CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL PRIMARY KEY,
    created_at    TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ,
    deleted_at    TIMESTAMPTZ,
    username      TEXT NOT NULL UNIQUE,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS urls (
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

CREATE TABLE IF NOT EXISTS clicks (
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