// // Analytics.jsx — click performance dashboard matching the 4-panel design:
// //   • Stats row (total clicks, top link, tracked links)
// //   • Daily clicks area chart  ← real DB data per selected short code
// //   • Top 10 URLs bar chart     ← real DB data
// //   • Device distribution donut ← demo data (not stored in DB)
// //   • Share of clicks donut     ← real DB data, properly coloured

// import { useEffect, useMemo, useState } from "react";
// import { MousePointerClick, Trophy, Link2 } from "lucide-react";
// import { getMyURLs, getDailyClicks, getMyTotalClicks, getDailyClicksByUser } from "../api/api";
// import { PageHeader, Card, ErrorBanner } from "../components/ui";
// import StatsCard from "../components/StatsCard";
// import TopLinksTable from "../components/TopLinksTable";
// import {
//   AreaTrend,
//   BarTrend,
//   DonutStat,
//   ChartLegend,
//   ChartSkeleton,
//   ChartEmpty,
// } from "../components/charts";
// import { formatNumber } from "../lib/format";

// // Colour palette for the two donuts 
// const SHARE_COLORS = [
//   "#3b82f6",
//   "#22c55e",
//   "#f97316",
//   "#a855f7",
//   "#ef4444",
// ];

// export default function Analytics() {
//   const [topLinks,     setTopLinks]     = useState([]);
//   const [totalClicks,  setTotalClicks]  = useState(null);
//   const [dailyData,    setDailyData]    = useState([]);
//   const [selectedCode, setSelectedCode] = useState(null);
//   const [loading,      setLoading]      = useState(true);
//   const [dailyLoading, setDailyLoading] = useState(false);
//   const [error,        setError]        = useState(null);
//   const [dailyDataByUser,    setDailyDataByUser]     = useState([]);
//   // const [loader,      loadDailyByUser]      = useState(true);


//   useEffect(() => {
//     Promise.all([
//       getMyURLs(),
//       getMyTotalClicks(),
//       getDailyClicksByUser()
//     ])
//       .then(([top, total, dailyUser]) => {
//         const list = top ?? [];
//         setTopLinks(list);
//         setTotalClicks(total?.total_clicks ?? 0);
//         setDailyDataByUser(dailyUser ?? []);

//         if (list.length > 0) loadDaily(list[0].short_code);
//       })
//       .catch((e) => setError(e.message))
//       .finally(() => setLoading(false));
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   const loadDailyByUser = async () => {
//     try {
//       const data = await getDailyClicksByUser();
//       setDailyDataByUser(data ?? []);
//     } catch {
//       setDailyDataByUser([]);
//     }
//   };

//   const loadDaily = async (code) => {
//     setSelectedCode(code);
//     setDailyLoading(true);
//     try {
//       const data = await getDailyClicks(code);
//       setDailyData(data ?? []);
//     } catch {
//       setDailyData([]);
//     } finally {
//       setDailyLoading(false);
//     }
//   };

//   // Share-of-clicks donut data — from real top links
//   const shareData = useMemo(
//     () =>
//       topLinks.slice(0, 5).map((l, i) => ({
//         name:  l.short_code,
//         value: l.click_count ?? 0,
//         color: SHARE_COLORS[i % SHARE_COLORS.length],
//       })),
//     [topLinks]
//   );

//   // Bar chart data for Top 10 URLs
//   const barData = useMemo(
//     () => topLinks.slice(0, 10).map((l) => ({ code: l.short_code, click_count: l.click_count ?? 0 })),
//     [topLinks]
//   );

//   if (error) {
//     return (
//       <div className="space-y-6">
//         <PageHeader title="Analytics" description="Click performance across all tracked links." />
//         <ErrorBanner>{error}</ErrorBanner>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-8">
//       <PageHeader
//         title="Analytics"
//         description="Click performance across all tracked links on LinkPulse."
//       />

//       {/* ── Stats row ── */}
//       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//         <StatsCard
//           label="Total clicks"
//           value={loading ? "…" : formatNumber(totalClicks ?? 0)}
//           sub="across all LinkPulse links"
//           icon={MousePointerClick}
//         />
//         <StatsCard
//           label="Top link clicks"
//           value={loading ? "…" : formatNumber(topLinks[0]?.click_count ?? 0)}
//           sub={topLinks[0]?.short_code ?? "—"}
//           icon={Trophy}
//           tone="success"
//         />
//         <StatsCard
//           label="Tracked links"
//           value={loading ? "…" : formatNumber(topLinks.length)}
//           icon={Link2}
//         />
//       </div>

//       {/* ── Row 1: Daily clicks + Top 10 URLs bar ── */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* Daily clicks area */}
//         <Card className="p-6">
//           <h2 className="font-semibold text-zinc-900 dark:text-white mb-1">Daily clicks</h2>
//           <p className="text-xs text-zinc-400 mb-4">
//             {selectedCode ? (
//               <>Last 30 days for{" "}
//                 <span className="font-mono text-zinc-600 dark:text-zinc-300">{selectedCode}</span>
//               </>
//             ) : (
//               "Select a link from the table below"
//             )}
//           </p>
//           {dailyLoading ? (
//             <ChartSkeleton height={220} />
//           ) : (
//             <AreaTrend
//               data={dailyData}
//               xKey="date"
//               yKey="clicks"
//               height={220}
//               color="var(--chart-blue)"
//             />
//           )}
//         </Card>

//         {/* Top 10 URLs bar */}
//         <Card className="p-6">
//           <h2 className="font-semibold text-zinc-900 dark:text-white mb-1">Top 10 URLs</h2>
//           <p className="text-xs text-zinc-400 mb-4">By total clicks</p>
//           {loading ? (
//             <ChartSkeleton height={220} />
//           ) : barData.length === 0 ? (
//             <ChartEmpty />
//           ) : (
//             <BarTrend
//               data={barData}
//               xKey="code"
//               yKey="click_count"
//               height={220}
//               color="var(--chart-success)"
//               barName="Clicks"
//             />
//           )}
//         </Card>
//       </div>

//       {/* ── Row 2: Device distribution (demo) + Share of clicks (real) ── */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         <Card className="p-6">
//           <h2 className="font-semibold text-zinc-900 dark:text-white mb-1">Month wise Daily clicks</h2>
//           <p className="text-xs text-zinc-400 mb-4">
//             {selectedCode ? (
//               <>Total last 30 days clicks
//               </>
//             ) : (
//               "Select a link from the table below"
//             )}
//           </p>
//           {dailyLoading ? (
//             <ChartSkeleton height={220} />
//           ) : (
//             <AreaTrend
//             data={dailyDataByUser}
//             xKey="date"
//             yKey="clicks"
//             height={220}
//             color="var(--chart-blue)"
//             />
//           )}
//         </Card>
//         {/* Share of clicks — real data */}
//         <Card className="p-6">
//           <h2 className="font-semibold text-zinc-900 dark:text-white mb-1">Share of clicks</h2>
//           <p className="text-xs text-zinc-400 mb-4">Top 5 links by volume</p>
//           {loading ? (
//             <ChartSkeleton height={180} />
//           ) : shareData.every((d) => d.value === 0) ? (
//             <ChartEmpty />
//           ) : (
//             <>
//               <DonutStat
//                 data={shareData}
//                 height={180}
//                 centerLabel="click_count"
//                 centerValue={formatNumber(shareData.reduce((s, d) => s + d.value, 0))}
//                 />
//               <div className="mt-5">
//                 <ChartLegend data={shareData} />
//               </div>
//             </>
//           )}
//         </Card>
//       </div>

//       {/* ── Top links table ── */}
//       <Card className="p-6">
//         <h2 className="font-semibold text-zinc-900 dark:text-white mb-1">Top links</h2>
//         <p className="text-xs text-zinc-400 mb-4">Ranked by total clicks — click View to load its daily trend above</p>
//         <TopLinksTable
//           links={topLinks}
//           loading={loading}
//           selectedCode={selectedCode}
//           onSelect={loadDaily}
//           />
//       </Card>
//     </div>
//   );
// }


// // const DEVICE_COLORS = {
// //   Desktop: "#3b82f6",
// //   Mobile:  "#22c55e",
// //   Tablet:  "#f97316",
// //   Other:   "#ef4444",
// // };

// // Demo device data — not stored in DB
// // const DEMO_DEVICE_DATA = [
// //   { name: "Desktop", value: 58, color: DEVICE_COLORS.Desktop },
// //   { name: "Mobile",  value: 30, color: DEVICE_COLORS.Mobile  },
// //   { name: "Tablet",  value: 9,  color: DEVICE_COLORS.Tablet  },
// //   { name: "Other",   value: 3,  color: DEVICE_COLORS.Other   },
// // ];
// {/* Device distribution — demo data */}
// {/* <Card className="p-6">
//   <h2 className="font-semibold text-zinc-900 dark:text-white mb-1">Device distribution</h2>
//   <p className="text-xs text-zinc-400 mb-4">Share of visits</p>
//   <DonutStat
//     data={DEMO_DEVICE_DATA}
//     height={180}
//     centerLabel="visits"
//     centerValue={formatNumber(DEMO_DEVICE_DATA.reduce((s, d) => s + d.value, 0))}
//   />
//   <div className="mt-5">
//     <ChartLegend data={DEMO_DEVICE_DATA} />
//   </div>
// </Card> */}

// Analytics.jsx — V3: unified analytics for both Short URLs and QR Codes.
// Tabs: Short URLs | QR Codes
// Short URL analytics: total clicks, device breakdown, country breakdown,
//   daily trend (per-user + per-code), top links table.
// QR analytics: total scans, device breakdown, daily scan trend.

import { useEffect, useMemo, useState } from "react";
import {
  MousePointerClick, Trophy, Link2, QrCode, ScanLine,
  Smartphone, Globe, TrendingUp,
} from "lucide-react";
import {
  getMyURLs,
  getMyTotalClicks,
  getDailyClicksByUser,
  getDailyClicks,
  getDeviceBreakdown,
  getCountryBreakdown,
  getQRTotalScans,
  getQRDailyScans,
  getQRDeviceBreakdown,
  getQRCountryBreakdown,
  getMyQRs,
} from "../api/api";
import { PageHeader, Card, ErrorBanner } from "../components/ui";
import StatsCard from "../components/StatsCard";
import TopLinksTable from "../components/TopLinksTable";
import {
  AreaTrend,
  BarTrend,
  DonutStat,
  ChartLegend,
  ChartSkeleton,
  ChartEmpty,
} from "../components/charts";
import { formatNumber } from "../lib/format";

// ── Colour palettes ───────────────────────────────────────────────────────────

const DEVICE_COLORS = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ef4444", "#06b6d4"];
const COUNTRY_COLORS = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ef4444", "#06b6d4", "#eab308", "#ec4899", "#14b8a6", "#f43f5e"];
const SHARE_COLORS = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ef4444"];

// ── Tab button ────────────────────────────────────────────────────────────────

function Tab({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors
        ${active
          ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
          : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
        }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

// ── Short URL Analytics ───────────────────────────────────────────────────────

function ShortURLAnalytics() {
  const [topLinks,      setTopLinks]      = useState([]);
  const [totalClicks,   setTotalClicks]   = useState(null);
  const [dailyByUser,   setDailyByUser]   = useState([]);
  const [dailyByCode,   setDailyByCode]   = useState([]);
  const [selectedCode,  setSelectedCode]  = useState(null);
  const [devices,       setDevices]       = useState([]);
  const [countries,     setCountries]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [dailyLoading,  setDailyLoading]  = useState(false);
  const [error,         setError]         = useState(null);

  useEffect(() => {
    Promise.all([
      getMyURLs(),
      getMyTotalClicks(),
      getDailyClicksByUser(),
      getDeviceBreakdown(),
      getCountryBreakdown(),
    ])
      .then(([urls, total, daily, devs, countries]) => {
        const list = urls ?? [];
        setTopLinks(list);
        setTotalClicks(total?.total_clicks ?? 0);
        setDailyByUser(daily ?? []);
        setDevices(devs ?? []);
        setCountries(countries ?? []);
        if (list.length > 0) loadDailyByCode(list[0].short_code);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDailyByCode = async (code) => {
    setSelectedCode(code);
    setDailyLoading(true);
    try {
      const data = await getDailyClicks(code);
      setDailyByCode(data ?? []);
    } catch {
      setDailyByCode([]);
    } finally {
      setDailyLoading(false);
    }
  };

  const shareData = useMemo(
    () => topLinks.slice(0, 5).map((l, i) => ({
      name: l.short_code, value: l.click_count ?? 0, color: SHARE_COLORS[i],
    })),
    [topLinks]
  );

  const deviceData = useMemo(
    () => devices.map((d, i) => ({ name: d.device || "Unknown", value: d.count, color: DEVICE_COLORS[i % DEVICE_COLORS.length] })),
    [devices]
  );

  const countryData = useMemo(
    () => countries.slice(0, 10).map((c, i) => ({ code: c.country || "Unknown", count: c.count, color: COUNTRY_COLORS[i % COUNTRY_COLORS.length] })),
    [countries]
  );

  if (error) return <ErrorBanner>{error}</ErrorBanner>;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          label="Total clicks"
          value={loading ? "…" : formatNumber(totalClicks ?? 0)}
          sub="across all your short links"
          icon={MousePointerClick}
        />
        <StatsCard
          label="Top link clicks"
          value={loading ? "…" : formatNumber(topLinks[0]?.click_count ?? 0)}
          sub={topLinks[0]?.short_code ?? "—"}
          icon={Trophy}
          tone="success"
        />
        <StatsCard
          label="Tracked links"
          value={loading ? "…" : formatNumber(topLinks.length)}
          icon={Link2}
        />
      </div>

      {/* Row 1: Daily (per-code) + Daily (user total) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Daily clicks — per link
          </h2>
          <p className="text-xs text-zinc-400 mb-4">
            {selectedCode
              ? <>Selected: <span className="font-mono text-zinc-600 dark:text-zinc-300">{selectedCode}</span></>
              : "Select a link from the table below"}
          </p>
          {dailyLoading ? <ChartSkeleton height={200} /> : (
            <AreaTrend data={dailyByCode} xKey="date" yKey="clicks" height={200} color="var(--chart-blue)" />
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Daily clicks — all links
          </h2>
          <p className="text-xs text-zinc-400 mb-4">Combined clicks across your account</p>
          {loading ? <ChartSkeleton height={200} /> : (
            <AreaTrend data={dailyByUser} xKey="date" yKey="clicks" height={200} color="var(--chart-success)" />
          )}
        </Card>
      </div>

      {/* Row 2: Device breakdown + Country breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
            <Smartphone className="w-4 h-4" /> Device breakdown
          </h2>
          <p className="text-xs text-zinc-400 mb-4">Clicks by device type</p>
          {loading ? <ChartSkeleton height={180} /> : deviceData.length === 0 ? <ChartEmpty /> : (
            <>
              <DonutStat
                data={deviceData}
                height={180}
                centerLabel="devices"
                centerValue={formatNumber(deviceData.reduce((s, d) => s + d.value, 0))}
              />
              <div className="mt-4"><ChartLegend data={deviceData} /></div>
            </>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
            <Globe className="w-4 h-4" /> Top countries
          </h2>
          <p className="text-xs text-zinc-400 mb-4">Clicks by country (top 10)</p>
          {loading ? <ChartSkeleton height={200} /> : countryData.length === 0 ? <ChartEmpty /> : (
            <BarTrend
              data={countryData}
              xKey="code"
              yKey="count"
              height={200}
              color="var(--chart-blue)"
              barName="Clicks"
            />
          )}
        </Card>
      </div>

      {/* Row 3: Share of clicks */}
      <Card className="p-6">
        <h2 className="font-semibold text-zinc-900 dark:text-white mb-1">Share of clicks</h2>
        <p className="text-xs text-zinc-400 mb-4">Top 5 links by volume</p>
        {loading ? <ChartSkeleton height={180} /> : shareData.every((d) => d.value === 0) ? <ChartEmpty /> : (
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <DonutStat
              data={shareData}
              height={180}
              centerLabel="clicks"
              centerValue={formatNumber(shareData.reduce((s, d) => s + d.value, 0))}
            />
            <div className="flex-1"><ChartLegend data={shareData} /></div>
          </div>
        )}
      </Card>

      {/* Top links table */}
      <Card className="p-6">
        <h2 className="font-semibold text-zinc-900 dark:text-white mb-1">Top links</h2>
        <p className="text-xs text-zinc-400 mb-4">Ranked by total clicks — click View to load its daily trend</p>
        <TopLinksTable
          links={topLinks}
          loading={loading}
          selectedCode={selectedCode}
          onSelect={loadDailyByCode}
        />
      </Card>
    </div>
  );
}

// ── QR Code Analytics ─────────────────────────────────────────────────────────

// function QRAnalytics() {
//   const [totalScans,    setTotalScans]    = useState(null);
//   const [dailyScans,    setDailyScans]    = useState([]);
//   const [devices,       setDevices]       = useState([]);
//   const [qrList,        setQRList]        = useState([]);
//   const [loading,       setLoading]       = useState(true);
//   const [error,         setError]         = useState(null);

//   useEffect(() => {
//     Promise.all([
//       getQRTotalScans(),
//       getQRDailyScans(),
//       getQRDeviceBreakdown(),
//       getMyQRs(),
//     ])
//       .then(([total, daily, devs, qrs]) => {
//         setTotalScans(total?.total_scans ?? 0);
//         setDailyScans(daily ?? []);
//         setDevices(devs ?? []);
//         setQRList(qrs ?? []);
//       })
//       .catch((e) => setError(e.message))
//       .finally(() => setLoading(false));
//   }, []);

//   const deviceData = useMemo(
//     () => devices.map((d, i) => ({ name: d.device || "Unknown", value: d.count, color: DEVICE_COLORS[i % DEVICE_COLORS.length] })),
//     [devices]
//   );

//   const topQRData = useMemo(
//     () => qrList.slice(0, 10).map((q) => ({ code: q.label || `QR #${q.id}`, click_count: q.scan_count ?? 0 })),
//     [qrList]
//   );

//   if (error) return <ErrorBanner>{error}</ErrorBanner>;

//   return (
//     <div className="space-y-6">
//       {/* Stats row */}
//       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//         <StatsCard
//           label="Total scans"
//           value={loading ? "…" : formatNumber(totalScans ?? 0)}
//           sub="across all your QR codes"
//           icon={ScanLine}
//         />
//         <StatsCard
//           label="Top QR scans"
//           value={loading ? "…" : formatNumber(qrList[0]?.scan_count ?? 0)}
//           sub={qrList[0]?.label || (qrList[0] ? `QR #${qrList[0].id}` : "—")}
//           icon={Trophy}
//           tone="success"
//         />
//         <StatsCard
//           label="QR codes created"
//           value={loading ? "…" : formatNumber(qrList.length)}
//           icon={QrCode}
//         />
//       </div>

//       {/* Row 1: Daily scans trend + Device breakdown */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         <Card className="p-6">
//           <h2 className="font-semibold text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
//             <TrendingUp className="w-4 h-4" /> Daily scans
//           </h2>
//           <p className="text-xs text-zinc-400 mb-4">Combined scans across all QR codes</p>
//           {loading ? <ChartSkeleton height={200} /> : (
//             <AreaTrend data={dailyScans} xKey="date" yKey="scans" height={200} color="var(--chart-blue)" />
//           )}
//         </Card>

//         <Card className="p-6">
//           <h2 className="font-semibold text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
//             <Smartphone className="w-4 h-4" /> Device breakdown
//           </h2>
//           <p className="text-xs text-zinc-400 mb-4">Scans by device type</p>
//           {loading ? <ChartSkeleton height={180} /> : deviceData.length === 0 ? <ChartEmpty /> : (
//             <>
//               <DonutStat
//                 data={deviceData}
//                 height={180}
//                 centerLabel="scans"
//                 centerValue={formatNumber(deviceData.reduce((s, d) => s + d.value, 0))}
//               />
//               <div className="mt-4"><ChartLegend data={deviceData} /></div>
//             </>
//           )}
//         </Card>
//       </div>

//       {/* Top QR codes bar */}
//       <Card className="p-6">
//         <h2 className="font-semibold text-zinc-900 dark:text-white mb-1">Top QR codes</h2>
//         <p className="text-xs text-zinc-400 mb-4">Ranked by total scans</p>
//         {loading ? <ChartSkeleton height={200} /> : topQRData.length === 0 ? <ChartEmpty /> : (
//           <BarTrend
//             data={topQRData}
//             xKey="code"
//             yKey="click_count"
//             height={200}
//             color="var(--chart-success)"
//             barName="Scans"
//           />
//         )}
//       </Card>
//     </div>
//   );
// }

// ── QR Code Analytics ─────────────────────────────────────────────────────────

const QR_POLL_MS = 15_000;

function QRAnalytics() {
  const [totalScans, setTotalScans] = useState(null);
  const [dailyScans, setDailyScans] = useState([]);
  const [devices,    setDevices]    = useState([]);
  const [countries,  setCountries]  = useState([]);
  const [qrList,     setQRList]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      Promise.all([
        getQRTotalScans(),
        getQRDailyScans(),
        getQRDeviceBreakdown(),
        getQRCountryBreakdown(),
        getMyQRs(),
      ])
        .then(([total, daily, devs, ctry, qrs]) => {
          if (cancelled) return;
          setTotalScans(total?.total_scans ?? 0);
          setDailyScans(daily ?? []);
          setDevices(devs ?? []);
          setCountries(ctry ?? []);
          setQRList(qrs ?? []);
          setError(null);
        })
        .catch((e) => !cancelled && setError(e.message))
        .finally(() => !cancelled && setLoading(false));

    load();
    // Poll so scans from a phone show up without a manual refresh
    const timer = setInterval(load, QR_POLL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  const rankedQRs = useMemo(
    () => [...qrList].sort((a, b) => (b.scan_count ?? 0) - (a.scan_count ?? 0)),
    [qrList]
  );

  const deviceData = useMemo(
    () => devices.map((d, i) => ({ name: d.device || "Unknown", value: d.count, color: DEVICE_COLORS[i % DEVICE_COLORS.length] })),
    [devices]
  );

  const countryData = useMemo(
    () => countries.slice(0, 10).map((c, i) => ({ code: c.country || "Unknown", count: c.count, color: COUNTRY_COLORS[i % COUNTRY_COLORS.length] })),
    [countries]
  );

  const topQRData = useMemo(
    () => rankedQRs.slice(0, 10).map((q) => ({ code: q.label || `QR #${q.id}`, scans: q.scan_count ?? 0 })),
    [rankedQRs]
  );

  if (error) return <ErrorBanner>{error}</ErrorBanner>;

  const top = rankedQRs[0];

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          label="Total scans"
          value={loading ? "…" : formatNumber(totalScans ?? 0)}
          sub="across all your QR codes"
          icon={ScanLine}
        />
        <StatsCard
          label="Top QR scans"
          value={loading ? "…" : formatNumber(top?.scan_count ?? 0)}
          sub={top ? (top.label || `QR #${top.id}`) : "—"}
          icon={Trophy}
          tone="success"
        />
        <StatsCard
          label="Active QR codes"
          value={loading ? "…" : formatNumber(qrList.length)}
          icon={QrCode}
        />
      </div>

      {/* Row 1: Daily scans trend + Device breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Daily scans
          </h2>
          <p className="text-xs text-zinc-400 mb-4">Combined scans across all QR codes</p>
          {loading ? <ChartSkeleton height={200} /> : (
            <AreaTrend data={dailyScans} xKey="date" yKey="scans" height={200} color="var(--chart-blue)" />
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
            <Smartphone className="w-4 h-4" /> Device breakdown
          </h2>
          <p className="text-xs text-zinc-400 mb-4">Scans by device type</p>
          {loading ? <ChartSkeleton height={180} /> : deviceData.length === 0 ? <ChartEmpty /> : (
            <>
              <DonutStat
                data={deviceData}
                height={180}
                centerLabel="scans"
                centerValue={formatNumber(deviceData.reduce((s, d) => s + d.value, 0))}
              />
              <div className="mt-4"><ChartLegend data={deviceData} /></div>
            </>
          )}
        </Card>
      </div>

      {/* Row 2: Top countries + Top QR codes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
            <Globe className="w-4 h-4" /> Top countries
          </h2>
          <p className="text-xs text-zinc-400 mb-4">Scans by country (top 10)</p>
          {loading ? <ChartSkeleton height={200} /> : countryData.length === 0 ? <ChartEmpty /> : (
            <BarTrend
              data={countryData}
              xKey="code"
              yKey="count"
              height={200}
              color="var(--chart-blue)"
              barName="Scans"
            />
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-1">Top QR codes</h2>
          <p className="text-xs text-zinc-400 mb-4">Ranked by total scans</p>
          {loading ? <ChartSkeleton height={200} /> : topQRData.every((d) => d.scans === 0) ? <ChartEmpty /> : (
            <BarTrend
              data={topQRData}
              xKey="code"
              yKey="scans"
              height={200}
              color="var(--chart-success)"
              barName="Scans"
            />
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Main Analytics page with tabs ─────────────────────────────────────────────

export default function Analytics() {
  const [tab, setTab] = useState("url");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Deep insights for your short links and QR codes."
      />

      {/* Tab row */}
      <div className="flex items-center gap-2">
        <Tab active={tab === "url"} onClick={() => setTab("url")} icon={Link2} label="Short URLs" />
        <Tab active={tab === "qr"}  onClick={() => setTab("qr")}  icon={QrCode} label="QR Codes"  />
      </div>

      {tab === "url" && <ShortURLAnalytics />}
      {tab === "qr"  && <QRAnalytics />}
    </div>
  );
}