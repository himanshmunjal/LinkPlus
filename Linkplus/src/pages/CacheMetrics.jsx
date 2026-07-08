// CacheMetrics.jsx — live stats from the JCache engine: hit/miss rates,
// evictions, current size, and a session trend built by polling the public
// /cache/stats endpoint (it has no history of its own, so the trend only
// covers points collected since this page was opened).

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, Trash2, Boxes, RefreshCw, Pause, Play } from "lucide-react";
import { getCacheStats } from "../api/api";
import { PageHeader, Card, Button, ErrorBanner, Badge } from "../components/ui";
import StatsCard from "../components/StatsCard";
import { DonutStat, ChartLegend, AreaTrend, ChartSkeleton } from "../components/charts";
import { formatNumber, formatPercent } from "../lib/format";

const POLL_MS = 5000;
const MAX_POINTS = 24;

export default function CacheMetrics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [history, setHistory] = useState([]);
  const intervalRef = useRef(null);

  const refresh = useCallback(() => {
    return getCacheStats()
      .then((data) => {
        setStats(data);
        setError(null);
        setHistory((prev) => {
          const point = {
            time: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            hitRate: Number((data.hit_rate ?? 0).toFixed(1)),
          };
          const next = [...prev, point];
          return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next;
        });
        return data;
      })
      .catch((e) => {
        setError(e.message);
        return null;
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    intervalRef.current = setInterval(refresh, POLL_MS);
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, refresh]);

  const hitMissData = stats
    ? [
        { name: "Hits", value: stats.hits ?? 0, color: "var(--chart-success)" },
        { name: "Misses", value: stats.misses ?? 0, color: "var(--chart-danger)" },
      ]
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Cache Metrics"
        description="Live stats from JCache, the in-memory cache sitting in front of PostgreSQL."
        action={
          <div className="flex items-center gap-2">
            <Badge tone={error ? "danger" : "success"}>
              {error ? "Unreachable" : "Connected"}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setAutoRefresh((v) => !v)}>
              {autoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
            </Button>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>
        }
      />

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Hit rate"
          value={loading ? "…" : formatPercent(stats?.hit_rate)}
          icon={CheckCircle2}
          tone="success"
        />
        <StatsCard
          label="Miss rate"
          value={loading ? "…" : formatPercent(stats?.miss_rate)}
          icon={XCircle}
          tone="danger"
        />
        <StatsCard
          label="Evictions"
          value={loading ? "…" : formatNumber(stats?.evictions ?? 0)}
          icon={Trash2}
        />
        <StatsCard
          label="Cache size"
          value={loading ? "…" : formatNumber(stats?.size ?? 0)}
          sub="keys in memory"
          icon={Boxes}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-1">Hits vs. misses</h2>
          <p className="text-xs text-zinc-400 mb-4">Cumulative since JCache started</p>
          {loading ? (
            <ChartSkeleton height={170} />
          ) : (
            <>
              <DonutStat
                data={hitMissData}
                height={170}
                centerLabel="lookups"
                centerValue={formatNumber((stats?.hits ?? 0) + (stats?.misses ?? 0))}
              />
              <div className="mt-5">
                <ChartLegend data={hitMissData} />
              </div>
            </>
          )}
        </Card>

        <Card className="lg:col-span-2 p-6">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-1">Hit rate, live session</h2>
          <p className="text-xs text-zinc-400 mb-4">
            Sampled every {POLL_MS / 1000}s while this page is open — not a stored history.
          </p>
          {loading ? (
            <ChartSkeleton height={220} />
          ) : (
            <AreaTrend data={history} xKey="time" yKey="hitRate" height={220} color="var(--chart-success)" />
          )}
        </Card>
      </div>

      {stats?.raw && (
        <details className="text-xs text-zinc-400 dark:text-zinc-500">
          <summary className="cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300 font-medium select-none">
            Raw response from JCache
          </summary>
          <pre className="mt-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-4 overflow-auto text-zinc-500 dark:text-zinc-400">
            {stats.raw}
          </pre>
        </details>
      )}
    </div>
  );
}
