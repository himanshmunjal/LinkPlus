// Dashboard.jsx — the landing page after login: a quick way to shorten a
// link, a glance at your own numbers, and your most recent links.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link2, MousePointerClick, QrCode, ArrowRight } from "lucide-react";
import { getMyURLs, getCacheStats, getMyQRs } from "../api/api";
import { useAuth } from "../context/AuthContext";
import { PageHeader, Card, Button } from "../components/ui";
import StatsCard from "../components/StatsCard";
import CreateLinkForm from "../components/CreateLinkForm";
import LinkTable from "../components/LinkTable";
import { BarTrend, ChartSkeleton } from "../components/charts";
import { formatNumber } from "../lib/format";

export default function Dashboard({ onNavigate }) {
  const { user } = useAuth();

  const [urls, setUrls] = useState([]);
  const [urlsLoading, setUrlsLoading] = useState(true);
  const [urlsError, setUrlsError] = useState(null);
  const [qrs, setQRs] = useState([]);
  const [qrsLoading, setqrsLoading] = useState(true);
  const [qrsError, setqrsError] = useState(null);

  const [cacheStats, setCacheStats] = useState(null);
  const [cacheLoading, setCacheLoading] = useState(true);

  const fetchURLs = useCallback(() => {
    setUrlsLoading(true);
    setUrlsError(null);
    getMyURLs()
      .then((data) => setUrls(data ?? []))
      .catch((e) => setUrlsError(e.message))
      .finally(() => setUrlsLoading(false));
      getMyQRs()
      .then((data) => setQRs(data ?? []))
      .catch((e) => setqrsError(e.message))
      .finally(() => setqrsLoading(false));
  }, []);

  useEffect(() => {
    fetchURLs();
    setCacheLoading(true);
    getCacheStats()
      .then(setCacheStats)
      .catch(() => setCacheStats(null))
      .finally(() => setCacheLoading(false));
  }, [fetchURLs]);

  const sortedByRecent = useMemo(
    () => [...urls].sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt)),
    [urls]
  );
  const recentLinks = sortedByRecent.slice(0, 5);
  const yourClicks = useMemo(() => urls.reduce((sum, u) => sum + (u.click_count ?? 0), 0), [urls]);

  const glanceData = useMemo(
    () =>
      [...urls]
        .sort((a, b) => (b.click_count ?? 0) - (a.click_count ?? 0))
        .slice(0, 6)
        .map((u) => ({ code: u.short_code, clicks: u.click_count ?? 0 })),
    [urls]
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back${user?.username ? `, ${user.username}` : ""}`}
        description="Here's how your links are doing right now."
      />

      <Card className="p-6">
        <CreateLinkForm onCreated={fetchURLs} />
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Your links"
          value={urlsLoading ? "…" : formatNumber(urls.length)}
          icon={Link2}
          tone="success"
        />
        <StatsCard
          label="Your clicks"
          value={urlsLoading ? "…" : formatNumber(yourClicks)}
          icon={MousePointerClick}
          tone="success"
        />
        <StatsCard
          label="Your QR Codes"
          value={qrsLoading ? "…" : formatNumber(qrs.length)}
          icon={QrCode}
          tone="success"
        />
        {/* <StatsCard
          label="Cache size"
          value={cacheLoading ? "…" : formatNumber(cacheStats?.size ?? 0)}
          sub="keys currently cached"
          icon={Boxes}
        /> */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-white">Recent links</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Your latest shortened URLs</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("urls")}>
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          <LinkTable urls={recentLinks} loading={urlsLoading} error={urlsError} compact />
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-1">At a glance</h2>
          <p className="text-xs text-zinc-400 mb-4">Clicks on your top links</p>
          {urlsLoading ? (
            <ChartSkeleton height={220} />
          ) : (
            <BarTrend data={glanceData} xKey="code" yKey="clicks" barName="Clicks" height={220} />
          )}
        </Card>
      </div>
    </div>
  );
}
