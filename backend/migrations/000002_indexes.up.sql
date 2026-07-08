-- All indexes in one migration so the DB is never in a half-indexed state.

-- clicks: the hottest table — short_code lookups, geo grouping, joins to urls
CREATE INDEX IF NOT EXISTS idx_clicks_short_code_clicked_at
    ON clicks (short_code, clicked_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_clicks_country
    ON clicks (country)
    WHERE deleted_at IS NULL AND country != '';

CREATE INDEX IF NOT EXISTS idx_clicks_url_id
    ON clicks (url_id)
    WHERE deleted_at IS NULL;

-- urls: user list, leaderboard, expiry worker
CREATE INDEX IF NOT EXISTS idx_urls_user_id
    ON urls (user_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_urls_click_count_desc
    ON urls (click_count DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_urls_expires_at
    ON urls (expires_at)
    WHERE expires_at IS NOT NULL AND deleted_at IS NULL;

-- urls: QR worker needs to find is_qr = true rows efficiently
CREATE INDEX IF NOT EXISTS idx_urls_is_qr
    ON urls (is_qr)
    WHERE is_qr = TRUE AND deleted_at IS NULL;

-- users: login lookup
CREATE INDEX IF NOT EXISTS idx_users_email
    ON users (email)
    WHERE deleted_at IS NULL;