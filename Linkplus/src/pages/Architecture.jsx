// Architecture.jsx — V4: updated to reflect Redis cache, QR analytics via qr_scans table,
// real-time polling, and the corrected user-scoped analytics routes.

import {
  Monitor, Server, Zap, Database, ArrowDown, Shield,
  PenSquare, MousePointerClick, QrCode, ScanLine, RefreshCw,
} from "lucide-react";
import { PageHeader, Card, Badge } from "../components/ui";

const SHORT_URL_FLOW = [
  { icon: Monitor,  title: "React Frontend",       detail: "Vite · Tailwind CSS · Recharts · lucide-react · 15 s auto-poll" },
  { icon: Server,   title: "Go API (Gin)",         detail: "JWT auth middleware · request validation · CORS · user-scoped analytics" },
  { icon: Zap,      title: "Redis",                detail: "Cache-aside lookup · 1-hour TTL · cache seeded on write" },
  { icon: Database, title: "PostgreSQL",           detail: "urls, clicks, users, refresh_tokens tables" },
];

const QR_FLOW = [
  { icon: Monitor,  title: "React Frontend",       detail: "QR Code form → POST /api/v1/qr → live scan_count subquery" },
  { icon: Server,   title: "Go API (Gin)",         detail: "go-qrcode generates PNG → base64 data URI returned inline" },
  { icon: Database, title: "PostgreSQL",           detail: "qr_codes + qr_scans — scan_count computed live via subquery" },
];

const STACK = {
  Frontend: ["React 19", "Vite", "Tailwind CSS v4", "Recharts", "lucide-react"],
  Backend:  ["Go", "Gin", "GORM", "JWT (HS256)", "bcrypt", "go-qrcode"],
  Data:     ["PostgreSQL", "Redis"],
};

function FlowNode({ icon: Icon, title, detail }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 flex items-center gap-4">
      <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shrink-0">
        <Icon className="w-5 h-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-zinc-900 dark:text-white">{title}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{detail}</p>
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex justify-center py-1">
      <ArrowDown className="w-4 h-4 text-zinc-400 dark:text-zinc-600 animate-pulse-dot" strokeWidth={2} />
    </div>
  );
}

function InfoCard({ icon: Icon, title, children }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shrink-0">
          <Icon className="w-4.5 h-4.5" strokeWidth={1.75} />
        </span>
        <h3 className="font-semibold text-zinc-900 dark:text-white">{title}</h3>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{children}</p>
    </Card>
  );
}

export default function Architecture() {
  return (
    <div className="space-y-8">
      <PageHeader title="System Architecture" description="How LinkPlus V4 handles short links and QR codes end-to-end." />

      {/* ── Two flows side by side ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="font-semibold text-lg text-zinc-900 dark:text-white flex items-center gap-2">
              <MousePointerClick className="w-4 h-4" /> Short URL flow
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Cache-aside lookup with async click tracking · 15 s live polling
            </p>
          </div>
          <div className="max-w-md mx-auto">
            {SHORT_URL_FLOW.map((node, i) => (
              <div key={node.title}>
                <FlowNode {...node} />
                {i < SHORT_URL_FLOW.length - 1 && <FlowArrow />}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="font-semibold text-lg text-zinc-900 dark:text-white flex items-center gap-2">
              <QrCode className="w-4 h-4" /> QR Code flow
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              On-demand PNG generation · scan_count via live DB subquery
            </p>
          </div>
          <div className="max-w-md mx-auto">
            {QR_FLOW.map((node, i) => (
              <div key={node.title}>
                <FlowNode {...node} />
                {i < QR_FLOW.length - 1 && <FlowArrow />}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Feature info cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoCard icon={Zap} title="Cache-aside pattern (Redis)">
          On every redirect lookup the API checks Redis first. On a miss it loads
          the original URL from PostgreSQL, writes it back into Redis with a fresh
          1-hour TTL, then sends the redirect — so every subsequent request for the
          same code is served straight from memory. Redis replaced the prior custom
          JCache implementation to gain battle-tested durability and pub/sub support.
        </InfoCard>

        <InfoCard icon={QrCode} title="QR Code generation & analytics">
          The Go backend uses skip2/go-qrcode to generate a PNG in memory. The image
          is returned as a base64 data URI on creation so the frontend can display
          and offer a download in a single round trip. Each QR code creates a backing
          short URL so scans flow through the same /r/:code redirect pipeline — device
          detection, geo-lookup, and qr_scans writes all happen in background goroutines.
          Scan counts are derived at query time via a correlated subquery, so they are
          always accurate without a separate increment path.
        </InfoCard>

        <InfoCard icon={MousePointerClick} title="Click & scan tracking">
          Both redirects and QR scan events return instantly. Device detection
          (user-agent parsing), IP geo-lookup, and DB writes all happen in background
          goroutines so tracking never adds latency. Device types: Desktop, iPhone,
          iPad, Android, Mobile, Tablet. Geo data comes from the MaxMind GeoIP
          resolver and is stored per-click for country/region/city breakdown.
        </InfoCard>

        <InfoCard icon={RefreshCw} title="Real-time click counts">
          The URLs page polls the /api/v1/url endpoint every 15 seconds, so click
          counts increment live in the table without requiring a manual refresh.
          The interval is cleared on component unmount to avoid memory leaks.
          Analytics charts also refresh on tab focus by re-mounting the inner
          component when the user switches between Short URL and QR Code tabs.
        </InfoCard>

        <InfoCard icon={ScanLine} title="User-scoped analytics">
          All analytics endpoints — /analytics/top, /analytics/total/me, /analytics/daily,
          /analytics/devices, /analytics/countries — are scoped to the authenticated user
          via the JWT's user_id claim. This means each user sees only their own links and
          click data, with no data leakage between accounts. QR analytics similarly join
          qr_scans back to qr_codes filtered by user_id.
        </InfoCard>

        <InfoCard icon={Shield} title="Authentication">
          Signup and login hash passwords with bcrypt and issue a 24-hour JWT
          (HS256) carrying the user's id, username, and email. A refresh-token
          flow extends sessions without re-login. Every protected route runs a
          Gin middleware that validates the bearer token — user identity comes
          from the token, never a client-supplied id.
        </InfoCard>

        <InfoCard icon={PenSquare} title="Write path">
          Creating a short link generates a random 6-character code, saves it in
          PostgreSQL, and immediately seeds Redis with the same TTL — so the
          very first redirect is already a cache hit. Creating a QR code generates
          a backing short URL (flagged is_qr=true so it is excluded from the URL
          management list) and writes a qr_codes row — no separate cache entry
          since the PNG is regenerated from the stored URL on demand.
        </InfoCard>
      </div>

      {/* ── Stack ── */}
      <Card className="p-6">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Built with</h3>
        <div className="space-y-4">
          {Object.entries(STACK).map(([layer, items]) => (
            <div key={layer} className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 w-20 shrink-0">
                {layer}
              </span>
              {items.map((item) => (
                <Badge key={item} tone="outline">{item}</Badge>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}