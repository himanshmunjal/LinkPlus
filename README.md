# LinkPlus

A self-hosted URL shortener and QR code platform with first-party analytics. It's built on Go (Gin), PostgreSQL, and JCache, a custom in-memory cache server that speaks the Redis protocol. A React dashboard lets you manage links and QR codes and view traffic analytics.

LinkPlus is designed around one principle: **every redirect and every scan is a real, trackable event**. Every metric shown in the dashboard comes from an actual HTTP request that reached the backend.

> For the full system design (request lifecycles, data model, caching strategy, auth flow, trade-offs, and scaling path), see **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

---

## Table of contents

- [Features](#features)
- [Architecture at a glance](#architecture-at-a-glance)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database migrations](#database-migrations)
- [API reference](#api-reference)
- [Rate limits](#rate-limits)
- [Design decisions](#design-decisions)
- [Known limitations & production checklist](#known-limitations--production-checklist)
- [Roadmap](#roadmap)

---

## Features

### Short URLs
- Generate a 7-character random short code (crypto/rand) for any valid URL
- Optional expiry (`expires_in`, in hours). Expired links stop resolving immediately and are purged by a background worker every 5 minutes.
- Cache-aside redirects through JCache, so hot links are served without a database round trip
- Redirects use **302**, not 301, so browsers don't cache the hop and every visit reaches the server to be counted
- Per-account analytics: daily trend, device breakdown, country breakdown, top links

### QR codes
- Generate a QR code for any destination URL. The user sees only the QR image, never a short link.
- **Every QR scan is a real, trackable event.** Each QR code is backed by a hidden short URL (`urls.is_qr = true`), and the QR image encodes `BASE_URL/r/<code>`, not the raw destination. A phone camera scan therefore goes through the same redirect pipeline, gets logged to `qr_scans`, and is then forwarded to the real destination.
- QR codes expire 6 hours after creation. After that the image endpoints refuse to serve them and the backing short link stops resolving.
- QR analytics (scans over time, per-QR trend, devices, countries) are kept separate from link analytics

### Analytics
- Device detection (Desktop, iPhone, iPad, Android, Mobile, Tablet) from the User-Agent
- Country / region / city via MaxMind GeoLite2, resolved off the request path in a goroutine
- IPs are never stored raw. Only a truncated SHA-256 hash is persisted.
- `HEAD` requests (link-preview bots, uptime checks) redirect but are **not** counted

### Accounts & security
- JWT access tokens (HS256, default 24h TTL) + bcrypt password hashing
- **Refresh-token rotation with reuse detection.** Refresh tokens are opaque, stored only as SHA-256 hashes, single-use, and grouped into a "family" per login. Replaying a used token revokes the whole family.
- Sliding-window rate limiting per IP, per route, backed by the cache
- Role-based access: the cache metrics endpoint and dashboard page are admin-only
- Graceful shutdown on SIGINT/SIGTERM with a 10s drain

---

## Architecture at a glance

```
           ┌──────────────┐        ┌─────────────────────────────────────────┐
 Browser ─►│ React (Vite) │──JWT──►│              Go API (Gin)               │
           └──────────────┘        │ CORS → RateLimit → Auth → Handler       │
                                   │            → Service → Repository       │
 Phone camera / link click ───────►│ GET /r/:code (public)                   │
                                   └───────┬───────────────┬─────────────────┘
                                           │               │
                                 cache-aside│               │ GORM
                                           ▼               ▼
                                   ┌──────────────┐  ┌──────────────┐
                                   │   JCache     │  │ PostgreSQL   │
                                   │ (RESP proto) │  │ users, urls, │
                                   │ url cache +  │  │ clicks, qr_*,│
                                   │ rate limits  │  │ refresh_tok. │
                                   └──────────────┘  └──────────────┘
                                                            ▲
                     background goroutine: device + GeoIP + │ insert click/scan
```

**Redirect path:** JCache lookup → (miss) Postgres → write back to cache → `302` → async click logging.
**QR path:** create hidden short URL → encode `BASE_URL/r/<code>` into PNG → store PNG on disk → return base64 image.

Full diagrams and step-by-step lifecycles are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Tech stack

**Backend**
- Go 1.25, [Gin](https://github.com/gin-gonic/gin): HTTP routing and middleware
- [GORM](https://gorm.io) + pgx: ORM over PostgreSQL
- [golang-migrate](https://github.com/golang-migrate/migrate): versioned SQL migrations, applied on startup
- [golang-jwt/jwt v5](https://github.com/golang-jwt/jwt): access tokens
- [go-redis v9](https://github.com/redis/go-redis): client for JCache (RESP2) and an optional Redis backend
- [skip2/go-qrcode](https://github.com/skip2/go-qrcode): QR PNG generation
- [oschwald/geoip2-golang](https://github.com/oschwald/geoip2-golang): MaxMind GeoLite2 lookups

**Frontend**
- React 19 + Vite, React Router 7
- Tailwind CSS 4
- Recharts (charts), lucide-react (icons)

**Data**
- PostgreSQL: system of record
- JCache: redirect cache + rate-limit counters
- MaxMind GeoLite2-City (`backend/geoip/GeoLite2-City.mmdb`)

---

## Project structure

```
backend/
├── cmd/main.go              # entrypoint: config, DI wiring, routes, worker, graceful shutdown
├── internals/
│   ├── handlers/            # HTTP layer: bind/validate input, map errors to status codes
│   ├── service/             # business logic: URL, QR, auth, analytics, cache interface
│   ├── repository/          # all SQL/GORM queries + migration runner + DB connect
│   ├── auth/                # JWT issue/parse, refresh-token generation & hashing
│   ├── middleware/          # RequireAuth, RequireAdmin, sliding-window rate limiter
│   ├── cache/               # JCacheClient and RedisClient (same interface)
│   ├── geo/                 # GeoLite2 resolver
│   └── worker/              # expired-URL sweeper
├── model/                   # GORM models + query projection structs
├── migrations/              # 000001…000006 .up/.down.sql
├── geoip/                   # GeoLite2-City.mmdb
└── qr/                      # generated QR PNGs (<id>.png), created at runtime

Linkplus/src/
├── api/api.js               # fetch wrapper: bearer token, silent refresh on 401, all endpoints
├── context/                 # AuthContext, ThemeContext
├── components/              # layout, sidebar, charts, tables, cards
├── lib/                     # formatting, nav config (admin filtering), expiry helpers
└── pages/                   # Dashboard, URLs, CreateLink, QRCodes, Analytics,
                             # CacheMetrics (admin), Architecture, Login, Signup
```

The backend follows a strict layering rule: **Handler → Service → Repository → Database**. Handlers never touch SQL, and repositories hold no business rules.

---

## Getting started

### Prerequisites
- Go 1.25+
- Node.js 18+
- PostgreSQL 14+
- A running JCache server (or swap in Redis, see [Design decisions](#design-decisions))
- MaxMind GeoLite2-City `.mmdb` at `backend/geoip/GeoLite2-City.mmdb`

### Backend

```bash
cd backend
cp env.example .env          # fill in DB credentials, JWT_SECRET, BASE_URL
go mod download
go run ./cmd                 # applies pending migrations, then listens on $PORT
```

Run it from inside `backend/`: migrations (`file://migrations`), the GeoIP DB (`geoip/...`), and QR images (`qr/`) use relative paths.

### Frontend

```bash
cd Linkplus
npm install
echo 'VITE_API_BASE=http://localhost:8080' > .env
npm run dev                  # http://localhost:5173
```

### Make yourself admin

New accounts are always `user`. To see Cache Metrics:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

Then log in again so the new role is in your JWT.

---

## Environment variables

| Variable | Description | Default / example |
|---|---|---|
| `PORT` | API listen port | `8080` |
| `GIN_MODE` | `debug` or `release` | `debug` |
| `BASE_URL` | Public origin encoded into QR images (`BASE_URL/r/<code>`). **Must be reachable from a phone.** | `https://go.example.com` |
| `FRONTEND_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | PostgreSQL connection | `localhost` / `5432` / … |
| `JCACHE_HOST` / `JCACHE_PORT` | JCache server | `localhost` / `6379` |
| `JWT_SECRET` | HS256 signing key. The server panics if unset. Generate with `openssl rand -hex 32`. | — |
| `JWT_TTL_HOURS` | Access-token lifetime | `24` |
| `VITE_API_BASE` (frontend) | Backend origin | `http://localhost:8080` |

---

## Database migrations

Applied automatically on startup by `repository.RunMigrations` (golang-migrate).

| Version | Adds |
|---|---|
| `000001_core_tables` | `users`, `urls` (incl. `is_qr`, `expires_at`, `click_count`), `clicks` |
| `000002_indexes` | Partial indexes for clicks (short_code+time, country, url_id), urls (user, click_count, expiry, is_qr), users (email) |
| `000003_refresh_tokens` | `refresh_tokens` with `family`, `revoked`, unique `token_hash` |
| `000004_qr_codes` | `qr_codes` (unique `short_code`, `image_path`, `scan_count`, `expires_at`) |
| `000005_add_refresh_tokens` | Re-declares `refresh_tokens` with `IF NOT EXISTS` (no-op on fresh DBs) |
| `000006_qr_scans` | `qr_scans` event table, FK → `qr_codes` with `ON DELETE CASCADE` |

Roll back one step:

```bash
migrate -path backend/migrations -database "$DATABASE_URL" down 1
```

---

## API reference

Base path: **`/api/v4`**. Everything except `/auth/signup|login|refresh` and `/r/:code` requires `Authorization: Bearer <access_token>`.

### Public
| Method | Path | Description |
|---|---|---|
| `GET` / `HEAD` | `/r/:code` | Resolve and `302` to the destination. `GET` is logged as a click or QR scan. `HEAD` is not logged. |

### Auth
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v4/auth/signup` | `{username, email, password}` → `{token, refresh_token, user}`. Password ≥ 8 chars with a digit. |
| `POST` | `/api/v4/auth/login` | `{email, password}` → `{token, refresh_token, user}` |
| `POST` | `/api/v4/auth/refresh` | `{refresh_token}` → `{access_token, refresh_token}` (rotates) |
| `GET` | `/api/v4/auth/me` | Claims of the current token |

### Short URLs
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v4/url` | `{url, expires_in?}` (hours) → `{short_code, original_url, click_count}` |
| `GET` | `/api/v4/url` | Caller's links (QR-backed links excluded) |
| `DELETE` | `/api/v4/url/:code` | Delete own link and evict it from cache |

### Link analytics
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v4/analytics/top` | Caller's top 10 links by clicks |
| `GET` | `/api/v4/analytics/daily` | Caller's clicks per day |
| `GET` | `/api/v4/analytics/daily/:code` | Clicks per day for one code |
| `GET` | `/api/v4/analytics/total/me` | Caller's total clicks |
| `GET` | `/api/v4/analytics/total` | Platform-wide total clicks |
| `GET` | `/api/v4/analytics/devices` | Caller's device breakdown |
| `GET` | `/api/v4/analytics/countries` | Caller's top 10 countries |

### QR codes
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v4/qr` | `{url, label?}` → `{id, original_url, label, image_b64, expires_at}` |
| `GET` | `/api/v4/qr` | Caller's QR codes |
| `GET` | `/api/v4/qr/:id/base64` | Stored PNG as a data URI |
| `GET` | `/api/v4/qr/:id/image` | Stored PNG as a download |
| `DELETE` | `/api/v4/qr/:id` | Delete QR, its backing short link, and its PNG |

### QR analytics
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v4/qr/analytics/daily` | Scans per day across caller's QR codes |
| `GET` | `/api/v4/qr/analytics/daily/:id` | Scans per day for one QR (owner-scoped) |
| `GET` | `/api/v4/qr/analytics/devices` | Device breakdown |
| `GET` | `/api/v4/qr/analytics/countries` | Top 10 countries |
| `GET` | `/api/v4/qr/analytics/total` | Total scans |

### Admin
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v4/admin/cache/stats` | JCache hits, misses, evictions, size, hit rate (role `admin`) |

---

## Rate limits

Sliding-window log, keyed `rl:<route>:<client IP>`, stored in JCache. Responses carry `X-RateLimit-Limit` and `X-RateLimit-Remaining`. A breach returns `429`.

| Route | Limit |
|---|---|
| `GET /r/:code` | 60 / minute |
| `POST /auth/signup` | 5 / minute |
| `POST /auth/login` | 5 / minute |
| `POST /auth/refresh` | 20 / minute |
| `POST /url` | 10 / minute |
| `POST /qr` | 5 / minute |

If the cache is unreachable the limiter **fails open** (sets `X-RateLimit-Error`), so a cache outage doesn't take the API down.

---

## Design decisions

**QR codes are backed by a hidden short URL.** A QR payload is fixed once printed. If it encoded the destination directly, the camera app would go straight there and the server would never see the scan. Encoding our own `/r/<code>` is the only way to get a real per-scan event. Commercial "dynamic QR" products use the same approach.

**302, not 301.** A 301 is cached by browsers, so repeat visits would never reach the server and analytics would undercount.

**Analytics are logged in a goroutine.** The redirect is issued first. The device parse, GeoIP lookup, and DB insert happen afterward, so a slow DB or GeoIP lookup never delays a user's redirect.

**Event rows plus a denormalised counter.** Each click inserts a `clicks` row and increments `urls.click_count` in one transaction. The event rows feed time-series and breakdowns. The counter makes "top links" a cheap indexed sort.

**Clicks and QR scans live in separate tables.** QR-backed URLs are flagged `is_qr` and their hits go to `qr_scans`. Link analytics and QR analytics never mix, and QR short links never show up in the URL list.

**The cache is behind an interface.** `service.Cache` (Get/Put/Delete/Ping/Close) is satisfied by both `JCacheClient` and `RedisClient`, so switching backends is a one-line change in `main.go`. The rate limiter has its own `RateLimiter` interface. Redis implements it atomically with a Lua script over a sorted set. JCache has no scripting, so its implementation uses striped in-process mutexes.

**Refresh tokens are opaque, hashed, rotated, and grouped into families.** A DB leak doesn't expose usable tokens. Each token works once. If a stolen token is replayed after the legitimate client has already used it, the whole login family is revoked.

**IPs are hashed.** Hashing keeps rough unique-visitor bucketing without storing the raw identifier.

---

## Known limitations & production checklist

These are real gaps to close before a production launch:

- [ ] **QR cleanup is not scheduled.** `QRService.CleanupExpired()` exists but nothing calls it, so expired `qr_codes` rows and `qr/*.png` files accumulate. (The backing short URL *is* purged by the URL expiry worker, so expired QRs do stop redirecting.) Fix: add a ticker worker like `ExpiryWorker`.
- [ ] **QR image endpoints don't check ownership.** `GET /qr/:id/image` and `/qr/:id/base64` look up by ID only, so any logged-in user can fetch another user's QR by guessing IDs. `GET /analytics/daily/:code` is likewise not owner-scoped.
- [ ] **`backend/.env` is tracked in git.** Remove it from the index (`git rm --cached backend/.env`), add `.env*` to `.gitignore`, and rotate `JWT_SECRET` and the DB password.
- [ ] **Cache TTL on a miss ignores link expiry.** `Resolve` re-caches with a flat 1-hour TTL. The expiry worker evicts within 5 minutes, so an expired link can keep redirecting for up to about 5 minutes.
- [ ] **Unsalted, truncated IP hash.** The IPv4 space is small enough to brute-force a SHA-256 of an IP. Use HMAC with a server secret (and rotate it) for real privacy.
- [ ] **One goroutine per redirect, unbounded.** Under a traffic spike this can pile up DB writes. A buffered channel + worker pool (or a queue such as Kafka/Redis Streams) with batch inserts would bound it.
- [ ] **Client IP behind a proxy.** Gin's `ClientIP()` trusts all proxies by default. Set `r.SetTrustedProxies(...)` to your load balancer, or both GeoIP and rate limiting can be spoofed via `X-Forwarded-For`.
- [ ] **Disk-based QR storage** assumes a persistent, single-instance filesystem. With multiple replicas or ephemeral disks, move PNGs to S3/R2 or regenerate them on demand.
- [ ] **JCache rate limiting is atomic per process only.** With several API replicas the limit is approximate. Use the Redis backend for exact distributed limits.
- [ ] **No tests or CI yet.** Service-layer unit tests (with a fake `Cache`) and repository tests against a throwaway Postgres are the next step.
- [ ] The in-app **Architecture page** (`Linkplus/src/pages/Architecture.jsx`) still says Redis replaced JCache and that scan counts come from a subquery. Both are out of date.

---

## Roadmap

- Custom aliases / vanity codes
- Bulk QR generation and branded QR styling
- Click-event queue with batched inserts
- Link password protection and per-link expiry editing
- CSV export of analytics
- Docker Compose for one-command local setup

---

## License

Specify a license (MIT, Apache 2.0, or proprietary) before publishing this repository publicly.
