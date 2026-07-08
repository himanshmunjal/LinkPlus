-- Auth: refresh token rotation with family-based revocation.

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT   NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked    BOOLEAN NOT NULL DEFAULT FALSE,
    family     TEXT    NOT NULL DEFAULT '',
    CONSTRAINT refresh_tokens_hash_unique UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
    ON refresh_tokens (user_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family
    ON refresh_tokens (family)
    WHERE deleted_at IS NULL;

-- The critical path: WHERE token_hash = ? AND revoked = FALSE AND expires_at > NOW()
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash_active
    ON refresh_tokens (token_hash)
    WHERE revoked = FALSE AND deleted_at IS NULL;