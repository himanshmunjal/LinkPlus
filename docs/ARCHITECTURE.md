# LinkPlus Architecture

This document explains how LinkPlus is put together: the components, how requests flow through them, how data is modelled, and the trade-offs behind each choice. File references point at the code that implements each piece.

---

## 1. Goals and non-goals

**Goals**
- Fast redirects: the hot path (`GET /r/:code`) should usually avoid the database entirely.
- Truthful analytics: every count comes from a real server-side request.
- QR codes whose scans are measurable even after the image is printed.
- Multi-tenant isolation: users only see and manage their own links, QR codes, and analytics.
- Analytics must never slow down or break a redirect.

**Non-goals (for now)**
- Multi-region deployment, horizontal autoscaling, or a message queue
- Custom aliases, link editing, team accounts

---

## 2. System context

```
                 ┌───────────────────────────────┐
                 │  React SPA (Linkplus/, Vite)  │
                 │  AuthContext · api.js         │
                 └──────────────┬────────────────┘
                                │ HTTPS, JSON, Bearer JWT
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                      Go API — backend/cmd/main.go                 │
│                                                                   │
│  Gin engine: Logger → Recovery → CORS                             │
│                                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ /r/:code    │  │ /api/v4/auth │  │ /api/v4/* (RequireAuth)  │  │
│  │ RateLimit   │  │ RateLimit    │  │ /admin/* (+RequireAdmin) │  │
│  └──────┬──────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│         ▼                ▼                       ▼                │
│     handlers/  ─────►  service/  ─────►  repository/              │
│                           │                     │                 │
│      worker/ExpiryWorker ─┤ (every 5 min)       │                 │
└───────────────────────────┼─────────────────────┼─────────────────┘
                            │ RESP (go-redis)     │ GORM / pgx
                            ▼                     ▼
                     ┌─────────────┐       ┌──────────────┐
                     │   JCache    │       │ PostgreSQL   │
                     │ url cache   │       │ system of    │
                     │ rl:* keys   │       │ record       │
                     └─────────────┘       └──────────────┘

   Local disk: backend/qr/<id>.png       GeoLite2-City.mmdb (in-process)
```

Phones scanning a QR code and browsers clicking a short link both reach the API through the same public `GET /r/:code` route.

---

## 3. Layering

| Layer | Package | Responsibility | Must not |
|---|---|---|---|
| Transport | `internals/handlers` | Bind and validate JSON, read the user ID from the context, map errors to HTTP status codes | Contain SQL or business rules |
| Cross-cutting | `internals/middleware` | Auth (JWT → context), admin role check, rate limiting | Know about specific resources |
| Domain | `internals/service` | Short-code generation, cache-aside, QR orchestration, auth and rotation, analytics recording | Build HTTP responses |
| Data | `internals/repository` | One method per query, transactions, migrations | Make policy decisions |
| Infra | `internals/cache`, `internals/geo`, `internals/auth` | Cache clients, GeoIP, JWT and token crypto | — |

Dependencies are wired by hand in `main.go` (constructor injection). There's no DI framework. Each service receives exactly the repositories and services it needs, which makes the dependency graph visible in one place:

```
CacheService(JCacheClient)
URLService(URLRepository, CacheService)
URLAnalytics(URLRepository, QRRepository)
AuthService(UserRepository, RefreshTokenRepository)
QRService(QRRepository, URLService, BASE_URL)
ExpiryWorker(URLRepository, CacheService)
```

---

## 4. Request lifecycles

### 4.1 Redirect: `GET /r/:code`

Code: `handlers/url_handler.go:RedirectURL`, `service/url_service.go:Resolve`, `service/analytics_service.go:RecordClick`

```
Client            RateLimit        URLService.Resolve           JCache     Postgres
  │ GET /r/abc1234   │                    │                       │           │
  ├─────────────────►│ rl:redirect:<ip>   │                       │           │
  │                  ├──── allowed ──────►│ GET abc1234           │           │
  │                  │                    ├──────────────────────►│           │
  │                  │                    │◄──── hit ─────────────┤           │
  │                  │                    │   (or miss ↓)         │           │
  │                  │                    ├── SELECT original_url, expires_at►│
  │                  │                    │   expired? → DEL key, 404         │
  │                  │                    ├── SET abc1234 url EX 3600 ───────►│
  │◄─────── 302 Location: original_url ───┤                       │           │
  │                                       │
  │                 go RecordClick(code, UA, IP)   ← only for GET, not HEAD
  │                       ├─ SELECT url by short_code (is_qr?)
  │                       ├─ parseDevice(UA), hashIP(IP), geo.Resolve(IP)
  │                       └─ is_qr ? INSERT qr_scans + scan_count++ (tx)
  │                                : INSERT clicks   + click_count++ (tx)
```

Key points:
- **Cache-aside.** The application owns the cache. It reads the cache first, falls back to the DB, then writes back. The cache is never the source of truth.
- **Cache key** is the bare short code and the value is the destination URL.
- **TTL.** On create, the TTL equals the remaining link lifetime (or 1h if the link never expires). On a miss, the entry is re-cached for 1h.
- **Errors.** A cache read error is treated as a miss. A cache write error is logged and ignored. The DB is authoritative.
- **302** so browsers revisit the server every time and analytics stay accurate.
- **HEAD isn't counted.** Link unfurlers (Slack, WhatsApp) and uptime checkers often send HEAD, and counting them would inflate numbers.

### 4.2 Create short URL: `POST /api/v4/url`

1. `RequireAuth` puts `userID` into the Gin context from the JWT.
2. The handler validates `url` (`binding:"required,url"`) and turns `expires_in` (hours) into `expiresAt`.
3. `URLService.CreateShortURL`:
   - `generateRandomCode(7)`: 7 bytes from `crypto/rand` → base64url → strip `-`/`_` → first 7 chars (≈62⁷ ≈ 3.5×10¹² codes)
   - `INSERT INTO urls`. The unique constraint on `short_code` is the final guard against collisions.
   - **Write-through warm-up:** `SET code url EX ttl`, so the first click is already a cache hit.

### 4.3 Create QR code: `POST /api/v4/qr`

Code: `service/qr_service.go:CreateQR`

```
1. expiresAt = now + 6h
2. URLService.CreateQRShortCode(url, user, expiresAt)   → urls row, is_qr = TRUE, cached
3. INSERT qr_codes (user_id, short_code, original_url, label, expires_at)
4. png = go-qrcode.Encode(BASE_URL + "/r/" + short_code, Medium, 256px)
5. write qr/<id>.png ; UPDATE qr_codes SET image_path
6. respond { id, original_url, label, image_b64: "data:image/png;base64,…", expires_at }
```

- The response never includes the short code. The user only gets the image.
- Error-correction level **Medium** (~15% recovery) balances density against tolerance for smudged or partially covered prints.
- The PNG is returned inline as a data URI, so the UI can show and download it without a second request.

### 4.4 QR scan

A phone camera reads `https://<BASE_URL>/r/<code>` and opens it. From then on it is exactly flow 4.1. `RecordClick` sees `is_qr = true`, looks up the `qr_codes` row by `short_code`, and writes a `qr_scans` row instead of a `clicks` row.

### 4.5 Login and token refresh

Code: `service/auth_service.go`, `auth/jwt.go`, `Linkplus/src/api/api.js`

```
Login:   bcrypt.Compare → access JWT (HS256, claims: user_id, username, email, role, exp)
                        → refresh = 32 random bytes (base64url), store SHA-256(refresh)
                          with family = new random id, expires in 30 days

Request: Authorization: Bearer <access>  → RequireAuth parses/validates → c.Set(userID, role…)

401 in SPA: api.js calls POST /auth/refresh {refresh_token}, stores the new pair,
            retries the original request once.

Rotate(refresh):
  h = SHA-256(refresh)
  row = active token with hash h (not revoked, not expired)
    └─ not found? If h exists but is REVOKED → reuse detected → revoke whole family → 401
  UPDATE … SET revoked = true WHERE hash = h AND revoked = false
    └─ RowsAffected == 0? Lost a race (same token used twice concurrently) → revoke family → 401
  issue new access JWT + new refresh token in the SAME family
```

Why this design:
- **Short-lived access token, long-lived refresh token.** Access tokens are stateless and need no DB hit per request. Refresh tokens are stateful, so they can be revoked.
- **Only hashes are stored**, so a DB dump doesn't yield usable tokens.
- **Rotation + family revocation** (the approach in the OAuth 2.0 Security BCP). If an attacker steals a refresh token, either the attacker or the real user will eventually present an already-used token. That trips detection and logs out every token descended from that login.
- **The conditional UPDATE** (`WHERE revoked = false`, check `RowsAffected`) is an optimistic concurrency check. It makes "use once" hold even under concurrent requests, without row locks.

### 4.6 Delete

- **URL:** `DELETE … WHERE short_code = ? AND user_id = ?` (ownership in the WHERE clause, hard delete), then cache `DEL` so it stops redirecting immediately. `clicks` cascade-delete through the FK.
- **QR:** verify owner → delete the `qr_codes` row (`qr_scans` cascade) → delete the backing short URL (and its cache entry) so old prints stop resolving → remove the PNG.

---

## 5. Data model

```
users ─┬──< urls ──────< clicks
       │     │ (is_qr = true)
       │     │ short_code (unique)
       │     ╎ joined by short_code (logical, not FK)
       ├──< qr_codes ──< qr_scans
       │
       └──< refresh_tokens
```

| Table | Key columns | Notes |
|---|---|---|
| `users` | `username` UQ, `email` UQ, `password_hash`, `role` | Role is `user` or `admin` |
| `urls` | `short_code` UQ, `user_id` FK, `original_url`, `click_count`, `expires_at`, `is_qr` | `click_count` is a denormalised counter |
| `clicks` | `url_id` FK (cascade), `short_code`, `device`, `country/region/city`, `ip_hash`, `clicked_at` | Append-only event log |
| `qr_codes` | `short_code` UQ, `user_id` FK, `original_url`, `label`, `image_path`, `scan_count`, `expires_at` | One per QR. Points to its hidden `urls` row. |
| `qr_scans` | `qr_id` FK (cascade), device/geo/ip_hash, `scanned_at` | Append-only event log |
| `refresh_tokens` | `token_hash` UQ, `user_id`, `family`, `revoked`, `expires_at` | |

**Indexes (000002, 000003, 000004, 000006).** All are partial indexes (`WHERE deleted_at IS NULL` and similar), so they stay small:
- `clicks(short_code, clicked_at DESC)`: per-link time series
- `clicks(url_id)`: joins for per-user aggregates
- `clicks(country) WHERE country <> ''`: geo breakdown
- `urls(user_id)`, `urls(click_count DESC)`, `urls(expires_at) WHERE expires_at IS NOT NULL`: list, leaderboard, expiry sweep
- `refresh_tokens(token_hash) WHERE revoked = false`: the refresh hot path

**Event log + counter.** `LogClick` and `LogScan` insert the event row and `UPDATE … SET count = count + 1` in **one transaction**. The increment is a single SQL expression, so concurrent clicks don't lose updates.

**Schema is owned by SQL migrations**, not GORM AutoMigrate. Changes are explicit, reviewable, and reversible (`.down.sql`), and they run before the GORM pool opens.

---

## 6. Caching

### 6.1 JCache

JCache is a custom in-memory cache server (separate project) that speaks **RESP2**, the Redis wire protocol, and adds a `STATS` command. Because it speaks RESP, the backend talks to it with the standard `go-redis` client (`Protocol: 2`, `DisableIdentity: true` to skip Redis-only handshake commands). The JCache server itself isn't in this repo.

Connection pool: 10 connections, 2 kept idle, 5s dial timeout, 3s read/write timeouts. Startup fails fast if `PING` fails.

### 6.2 Swappable backend

```go
type Cache interface {            // service/cache_service.go
    Get(key) (string, bool, error)
    Put(key, value, ttlSeconds) error
    Delete(key) error
    Ping() error; Close() error
}
type RateLimiter interface {      // middleware/rate_limiter.go
    RateLimit(key, max, windowSec) (allowed bool, current int, err error)
}
```

`JCacheClient` and `RedisClient` both satisfy both interfaces. To switch to Redis, construct `cache.NewRedisClient(addr)` in `main.go`.

### 6.3 Consistency

| Event | Cache action |
|---|---|
| Create link | `SET` with TTL = remaining lifetime (warm-up) |
| Redirect miss | `SET` with 1h TTL |
| Redirect miss on an expired row | `DEL`, return 404 |
| Delete link / QR | `DEL` |
| Expiry worker | `DEL` each expired code, then delete the rows |

Links can't be edited, so the only invalidation events are delete and expiry, and both evict explicitly. Known gap: a miss re-caches with a flat 1h TTL instead of `min(1h, time until expiry)`, so an expired link can keep resolving until the next worker sweep (≤ 5 min).

---

## 7. Rate limiting

Code: `middleware/rate_limiter.go`, `cache/*_client.go`

**Algorithm: sliding-window log.** For each `rl:<route>:<ip>` key, store the timestamps of recent requests. On each request: drop timestamps older than `now − window`, count what's left, admit if `count < limit`, and record `now`.

Why sliding-window log rather than a fixed window: a fixed window lets a client send 2× the limit across a boundary (end of minute 1 + start of minute 2). The log is exact, at the cost of O(limit) memory per key, which is tiny at these limits (≤ 60).

| Backend | Storage | Atomicity |
|---|---|---|
| Redis | Sorted set scored by ms timestamp, Lua script `ZREMRANGEBYSCORE → ZCARD → ZADD → PEXPIRE` | Atomic across all API replicas |
| JCache | One string key of comma-separated timestamps, `EX = window` | 64 striped `sync.Mutex`es (FNV hash of key), so atomic **within one process** only |

**Fail-open:** if the cache errors, the request goes through with an `X-RateLimit-Error` header. Availability matters more than strict limiting for a link service. The trade-off is that a cache outage also removes brute-force protection on login.

---

## 8. Analytics pipeline

```
redirect handler ──go──► RecordClick
                           ├── FindURLbyShortCode   (DB read: url id + is_qr)
                           ├── parseDevice(UA)      (substring match: android, iphone, ipad, mobile, tablet → else Desktop)
                           ├── hashIP(IP)           (SHA-256, first 16 hex chars)
                           ├── geo.Resolve(IP)      (in-process mmdb lookup, microseconds)
                           └── tx: INSERT event + counter++
```

Aggregations are computed **at read time** with `GROUP BY DATE(...)`, device, or country, joined to `urls` or `qr_codes` and filtered by `user_id`. That's fine at small and medium scale because of the indexes above. At larger scale, see §11.

The GeoLite2 reader is opened once in `geo.init()` and shared. `maxminddb` readers are memory-mapped and safe for concurrent use. If the file is missing, every lookup returns empty fields and analytics show "Unknown".

---

## 9. Background work

| Worker | Where | Interval | Does |
|---|---|---|---|
| `ExpiryWorker` | `worker/expiry_worker.go` | 5 min | `SELECT` expired URLs → cache `DEL` each → hard-delete rows (clicks cascade). Also covers QR-backed short URLs. |
| QR cleanup | `QRService.CleanupExpired` | **not scheduled** | Would delete expired `qr_codes` rows and PNGs. Needs a ticker in `main.go`. |

The worker runs under a cancellable `context`, so it stops when `main` returns.

---

## 10. Reliability and security

- **Graceful shutdown:** SIGINT/SIGTERM → `srv.Shutdown` with a 10s deadline, so in-flight requests finish.
- **Server timeouts:** read/write 10s, idle 60s, which protects against slow-loris style clients.
- **Panic recovery:** `gin.Recovery()`.
- **Fail-fast config:** missing `JWT_SECRET` panics, an unreachable JCache is fatal at boot, and a failed migration is fatal.
- **Ownership checks** are mostly in SQL `WHERE user_id = ?`, so a missing check returns "not found" instead of leaking whether a resource exists.
- **JWT:** HS256 with an algorithm check (`SigningMethodHMAC`), which blocks `alg: none` and RS/HS confusion.
- **Passwords:** bcrypt (default cost 10), minimum 8 chars with a digit.
- **CORS:** a single allowed origin from `FRONTEND_ORIGIN`.

Known gaps are listed in the README's [production checklist](../README.md#known-limitations--production-checklist): QR image IDOR, `.env` tracked in git, untrusted `X-Forwarded-For`, unsalted IP hash.

---

## 11. Scaling path

Rough single-node picture: a cache hit is one network round trip to JCache plus a 302. A miss adds one indexed point lookup on `urls.short_code`. Writes per redirect: 1 SELECT + 1 INSERT + 1 UPDATE in the background.

What breaks first, and the fix:

1. **Write amplification from clicks.** Each redirect costs one goroutine and three queries. → Push events into a bounded channel or a queue (Redis Streams, Kafka) and batch-insert (`COPY` or multi-row INSERT). Carry `url_id`/`is_qr` from the cache so the extra SELECT goes away. Keep counters in the cache (`INCR`) and flush them periodically.
2. **Read-time aggregation.** `GROUP BY` over millions of rows gets slow. → Pre-aggregated daily rollup tables (`clicks_daily(url_id, day, device, country, n)`), or a columnar store such as ClickHouse or TimescaleDB for events.
3. **Multiple API replicas.** → Move QR PNGs to object storage (S3/R2) or regenerate them on demand (it's deterministic). Use Redis or the Lua limiter for exact distributed limits. Set trusted proxies.
4. **Cache.** → A Redis cluster or JCache sharded by short code. Hot keys can also get a small in-process LRU in front.
5. **Database.** → Read replicas for analytics. Partition `clicks` by month.
6. **Short-code space.** 62⁷ ≈ 3.5 trillion codes. Collision probability stays negligible to billions of links. On a unique-constraint violation, retry with a new code (not implemented yet).

---

## 12. Frontend architecture

- **Routing:** React Router with a `ProtectedRoute` wrapper. Unauthenticated users go to Login.
- **Auth state:** `AuthContext` holds the user. Tokens live in `localStorage` (simple, but readable by XSS. An httpOnly cookie for the refresh token is the hardening step).
- **API layer:** `api/api.js` is the only module that calls `fetch`. It adds the bearer header, catches a 401, calls `/auth/refresh`, and retries once. It also dispatches an `auth:refreshed` event so the context stays in sync.
- **Role-aware navigation:** `lib/nav.js` filters admin-only items (Cache Metrics). This is cosmetic only. The real enforcement is `RequireAdmin` on the server.
- **Charts:** Recharts for daily trends, device and country breakdowns, and the cache hit-rate trend (polled).
