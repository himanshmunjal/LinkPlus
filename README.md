# LinkPlus

A self-hosted URL shortener and QR code platform with first-party analytics — built on Go, PostgreSQL, and a custom in-memory cache layer, with a React dashboard for managing links, QR codes, and traffic insight.

LinkPlus is designed around one principle: **every redirect and every scan is a real, trackable event**. There's no client-side faking of analytics — every metric shown in the dashboard is derived from an actual HTTP request that touched the backend.

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database migrations](#database-migrations)
- [API reference](#api-reference)
- [Design decisions](#design-decisions)
- [Known limitations & production checklist](#known-limitations--production-checklist)
- [Roadmap](#roadmap)

---

## Features

### Short URLs
- Generate short, shareable links from any valid URL
- Optional expiry — links can be set to auto-expire and are purged by a background worker
- Cache-aside redirects via a custom in-memory cache (JCache), so hot links are served without a database round trip
- Per-link and per-account click analytics: daily trend, device breakdown, country breakdown, top performers

### QR codes
- Generate a QR code for any destination URL — the user only ever sees a QR code, never a short link
- QR codes expire automatically 6 hours after creation; the underlying image is purged from disk and the database row is removed by a scheduled worker
- **Every QR scan is a real, trackable event.** Internally, each QR code is backed by a short URL that the QR image actually encodes — so when a phone's camera app scans the code, it hits the same redirect pipeline as a normal short link, gets logged, and is then forwarded to the real destination. The user is never shown this short link; it exists purely as the tracking mechanism behind the scenes.
- QR analytics surface the same metrics as short URLs (scans over time, device breakdown) without exposing the backing link in the UI

### Analytics
- Device detection (Desktop, iPhone, iPad, Android, Mobile, Tablet) parsed from the User-Agent on every click/scan
- Country/region/city resolution via MaxMind GeoIP2, recorded asynchronously so tracking never adds latency to a redirect
- IP addresses are never stored in plaintext — only a SHA-256 hash is persisted, sufficient for unique-visitor heuristics without retaining identifying data
- Separate, purpose-built analytics views for short URLs and QR codes, rather than one generic "clicks" dashboard

### Accounts & security
- JWT-based authentication (HS256) with bcrypt password hashing
- Refresh-token flow so sessions can be extended without forcing re-login
- All link/QR mutation and analytics endpoints require an authenticated, scoped request — a user can only see and manage their own data
- Admin-only cache metrics endpoint, gated by a separate role check

---

## Architecture

### Short URL redirect flow

```
Browser → GET /r/:code
            │
            ▼
     Go API (Gin) ──► JCache lookup (cache-aside)
            │                │
            │           hit  │  miss
            │                ▼
            │         PostgreSQL lookup
            │                │
            │         write-back to JCache (TTL)
            │                │
            ◄────────────────┘
            │
       302 redirect to original URL
            │
            ▼
   (async, non-blocking) record click:
   device parse · IP hash · GeoIP lookup · DB write
```

The redirect response is never blocked on analytics. Click logging happens in a background goroutine after the redirect has already been issued.

### QR code flow (post short-URL-backed redesign)

```
User submits destination URL
            │
            ▼
   Go API creates an internal short URL
   (never exposed in any API response)
            │
            ▼
   QR PNG is generated, encoding the
   *short* URL — not the raw destination
            │
            ▼
   PNG written to disk, row saved with
   a 6-hour expires_at timestamp
            │
            ▼
   User receives only the QR image
   (base64 data URI) — no link shown

   ── time passes ──

   Phone camera scans QR
            │
            ▼
   Hits GET /r/:code (same redirect
   pipeline as a normal short URL)
            │
            ├─► logged as a click (device, geo, IP hash)
            │
            ▼
   302 redirect to the real destination
```

This is the key architectural change in this version: a QR code with no backing redirect endpoint is structurally unable to report real scan data, because a phone's native camera app reads the destination directly from the QR's encoded payload and never talks to your server. Routing the QR through a short URL is the only way to receive a real server-side event per scan, while downloads, reprints, and shares of the QR image remain irrelevant to tracking accuracy — every scan, regardless of where the image lives, still has to resolve through the redirect endpoint.

### Background workers

| Worker | Responsibility | Interval |
|---|---|---|
| URL expiry worker | Deletes short URLs past their `expires_at`, evicts them from cache | configurable |
| QR expiry worker | Deletes QR rows past their 6-hour `expires_at`, removes the on-disk PNG and the backing short URL | 15 min |

---

## Tech stack

**Backend**
- Go, [Gin](https://github.com/gin-gonic/gin) — HTTP routing and middleware
- [GORM](https://gorm.io) — ORM over PostgreSQL
- [golang-migrate](https://github.com/golang-migrate/migrate) — versioned SQL migrations
- [golang-jwt](https://github.com/golang-jwt/jwt) — JWT issuing/validation
- [skip2/go-qrcode](https://github.com/skip2/go-qrcode) — in-memory QR PNG generation
- [oschwald/geoip2-golang](https://github.com/oschwald/geoip2-golang) — MaxMind GeoIP2 lookups
- JCache — custom in-memory TCP cache for redirect lookups

**Frontend**
- React (Vite)
- Tailwind CSS
- Recharts — analytics charts
- lucide-react — iconography

**Data**
- PostgreSQL — primary datastore
- MaxMind GeoLite2 (`.mmdb`) — IP geolocation database (not bundled; see [Known limitations](#known-limitations--production-checklist))

---

## Project structure

```
backend/
├── cmd/                    # main.go — server entrypoint, route wiring, graceful shutdown
├── internals/
│   ├── handlers/            # HTTP layer — request parsing, response shaping (no business logic)
│   ├── service/              # Business logic — short URL creation, QR generation, analytics
│   ├── repository/         # Database layer — all SQL/GORM queries, one method per query
│   ├── auth/                # JWT issuing and validation
│   ├── middleware/         # Auth guard, admin guard, rate limiting
│   ├── cache/                # JCache / Redis client wrappers
│   ├── geo/                  # GeoIP resolution
│   └── worker/              # Background goroutines (URL expiry, QR expiry)
├── model/                   # GORM structs + query projection types
├── migrations/             # Versioned .up.sql / .down.sql files
└── geoip/                    # MaxMind .mmdb database lives here (not committed)

Linkplus/
└── src/
    ├── api/                  # Centralized fetch wrapper + all backend calls
    ├── components/         # Shared UI (cards, charts, layout, sidebar)
    ├── context/             # Auth + theme providers
    ├── lib/                  # Formatting, nav config, expiry helpers
    └── pages/                # Dashboard, URLs, QR Codes, Analytics, Architecture, Cache Metrics
```

The backend follows a strict layering rule: **Handler → Service → Repository → Database**, with each layer only ever calling the one directly below it. This keeps business logic out of HTTP handlers and SQL out of services, so any layer can be modified or tested independently.

---

## Getting started

### Prerequisites
- Go 1.25+
- Node.js 18+ and a package manager (npm/pnpm/yarn)
- PostgreSQL 14+
- A MaxMind GeoLite2 Country/City `.mmdb` file ([free signup required](https://dev.maxmind.com/geoip/geolite2-free-geolocation-data))

### Backend setup

```bash
cd backend
cp env.example .env
# edit .env with your DB credentials and a strong JWT_SECRET

go mod download

# place your GeoLite2 .mmdb file at backend/geoip/

go run cmd/main.go
```

On startup the server applies all pending migrations automatically and begins listening on `PORT` (default `8080`).

### Frontend setup

```bash
cd Linkplus
npm install
npm run dev
```

Set `VITE_API_BASE` in a `.env` file under `Linkplus/` if your backend isn't running on `http://localhost:8080`.

---

## Environment variables

| Variable | Description | Example |
|---|---|---|
| `PORT` | Port the API listens on | `8080` |
| `GIN_MODE` | `debug` or `release` | `release` |
| `FRONTEND_ORIGIN` | Allowed CORS origin | `https://app.yourdomain.com` |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | PostgreSQL connection | — |
| `JCACHE_HOST` / `JCACHE_PORT` | Cache server connection | `localhost` / `6379` |
| `JWT_SECRET` | HS256 signing secret — generate with `openssl rand -hex 32` | — |
| `JWT_TTL_HOURS` | Access token lifetime | `24` |

**Never commit `.env` to version control.** `env.example` is provided as a template only.

---

## Database migrations

Migrations are versioned, sequential `.up.sql` / `.down.sql` pairs under `backend/migrations/`, applied automatically on server start via `golang-migrate`.

| Version | Adds |
|---|---|
| `000001` | Initial schema — users, urls, clicks |
| `000002` | Country/city columns on clicks |
| `000003` | Performance indexes |
| `000004` | URL expiry support |
| `000005` | Refresh tokens |
| `000006` | Schema cleanup/normalization |
| `000007` | QR codes — `qr_codes`, `qr_scans` tables |
| `000008` | QR image path + 6-hour expiry timestamp |

To roll back the most recent migration:

```bash
migrate -path backend/migrations -database "$DATABASE_URL" down 1
migrate -path ./migrations -database "postgres://postgres:1981@localhost:5432/URL_Shortner?sslmode=disable" down 1
```

---

## API reference

All endpoints below (except `/auth/*` and `/r/:code`) require `Authorization: Bearer <token>`.

### Auth
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/auth/signup` | Create an account |
| `POST` | `/api/v1/auth/login` | Authenticate, receive access + refresh tokens |
| `POST` | `/api/v1/auth/refresh` | Exchange a refresh token for a new access token |
| `GET` | `/api/v1/auth/me` | Current authenticated user |

### Short URLs
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/url` | Create a short URL |
| `GET` | `/api/v1/url` | List the caller's short URLs |
| `DELETE` | `/api/v1/url/:code` | Delete a short URL |
| `GET` | `/r/:code` | Public redirect — logs a click, then 302s to the destination |

### Short URL analytics
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/analytics/top` | Top-performing links |
| `GET` | `/api/v1/analytics/daily` | Daily clicks across the account |
| `GET` | `/api/v1/analytics/daily/:code` | Daily clicks for one link |
| `GET` | `/api/v1/analytics/total/me` | Total clicks for the caller |
| `GET` | `/api/v1/analytics/devices` | Device breakdown |
| `GET` | `/api/v1/analytics/countries` | Country breakdown |

### QR codes
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/qr` | Generate a QR code (response includes only the PNG, never the backing short link) |
| `GET` | `/api/v1/qr` | List the caller's QR codes |
| `GET` | `/api/v1/qr/:id/base64` | Fetch the stored QR PNG as a data URI |
| `GET` | `/api/v1/qr/:id/image` | Download the stored QR PNG (authenticated) |
| `DELETE` | `/api/v1/qr/:id` | Delete a QR code |

### QR analytics
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/qr/analytics/daily` | Daily scans across all QR codes |
| `GET` | `/api/v1/qr/analytics/daily/:id` | Daily scans for one QR code |
| `GET` | `/api/v1/qr/analytics/devices` | Device breakdown for scans |
| `GET` | `/api/v1/qr/analytics/total` | Total scans |

### Admin
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/admin/cache/stats` | Cache hit/miss metrics (admin role required) |

---

## Design decisions

**Why a QR code is backed by a hidden short URL.** A QR code's payload is fixed at generation time — once printed or downloaded, there's no way to intercept what a camera app does with it. The only way to receive a real, per-scan server event is for the QR to encode a link that resolves through your own infrastructure. This is the same approach used by every commercial QR analytics product; the alternative (encoding the destination directly) makes scan analytics structurally impossible to collect, regardless of how the backend code is written.

**Why click/scan recording happens in a goroutine, not inline.** Analytics should never be allowed to slow down or fail the user-facing action. A redirect or a QR resolution succeeds first; the device parse, IP hash, and GeoIP lookup happen afterward, off the response path.

**Why IP addresses are hashed, not stored raw.** Hashing preserves the ability to deduplicate or bucket visitors without retaining an identifying value in the database — a deliberate data-minimization choice rather than an oversight.

**Why QR codes expire after 6 hours.** QR PNGs are stored on disk rather than regenerated per-request, and an unbounded retention policy on generated files is both a storage liability and rarely useful for the kind of short-lived campaign links QR codes are typically used for. The expiry worker keeps disk usage bounded automatically.

---

## Known limitations & production checklist

This section is intentionally direct — these are real gaps to close before a production launch, not hypothetical edge cases.

- [ ] **GeoIP database is not bundled.** `backend/geoip/` ships empty. Without a valid `.mmdb` file in that directory, geolocation will return blank or default values for every request — this is the most common cause of clicks/scans showing an unexpected or incorrect country. Download a current GeoLite2 database from MaxMind and confirm it loads on startup before relying on country analytics.
- [ ] **Verify client IP extraction behind a proxy.** If deployed behind a reverse proxy, load balancer, or platform like Render/Railway/Cloudflare, confirm the server is reading the real client IP (typically via `X-Forwarded-For`) and not the proxy's own IP — otherwise every visitor will appear to geolocate to your hosting provider's data center location.
- [ ] **No frontend `package.json` is currently committed to this repository.** Confirm dependency versions and lockfile are committed before deploying the frontend, so builds are reproducible.
- [ ] **Disk-based QR storage assumes a persistent filesystem.** Many free-tier hosts (Render, Railway free plans) wipe local disk on every redeploy or sleep/wake cycle. Given QR codes already expire after 6 hours, this is a low-risk trade-off for most deployments — but if your platform restarts frequently, consider moving QR storage to S3/R2 or storing the PNG bytes directly in PostgreSQL instead.
- [ ] **Set `GIN_MODE=release` and rotate `JWT_SECRET`** before going live — both ship with development-friendly defaults.
- [ ] **Rate limiting** exists as middleware scaffolding but should be reviewed and tuned for expected production traffic before launch.

---

## Roadmap

- Custom short codes / vanity URLs
- Bulk QR generation
- Webhook notifications on link expiry
- Per-link password protection
- Exportable analytics reports (CSV/PDF)

---

## License

Specify your license here (MIT, Apache 2.0, or proprietary) before publishing this repository publicly.