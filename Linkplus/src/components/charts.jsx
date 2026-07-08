// charts.jsx — themed Recharts wrappers.
// CSS variables must be defined in index.css under :root and .dark

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const tooltipStyle = {
  background: "var(--chart-tooltip-bg)",
  border: "1px solid var(--chart-tooltip-border)",
  borderRadius: 12,
  fontSize: 12,
  padding: "8px 12px",
  boxShadow: "0 12px 28px -10px rgba(0,0,0,0.35)",
};
const tooltipLabelStyle  = { color: "var(--chart-tooltip-text)", fontWeight: 600, marginBottom: 4 };
const tooltipItemStyle   = { color: "var(--chart-tooltip-text)" };
const axisTick           = { fontSize: 11, fill: "var(--chart-axis)" };

// Format a date string like "2026-06-18T00:00:00Z" → "Jun 18"
function fmtDate(raw) {
  if (!raw) return raw;
  try {
    return new Date(raw).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    // If it's already a short string just return it
    return raw;
  }
}

export function ChartEmpty({ message = "No data yet." }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[160px] text-sm text-zinc-400 dark:text-zinc-500">
      {message}
    </div>
  );
}

export function ChartSkeleton({ height = 220 }) {
  return (
    <div
      className="animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800/60"
      style={{ height }}
    />
  );
}

/** Single-series vertical bar chart. */
export function BarTrend({ data, xKey, yKey, height = 220, color = "var(--chart-ink)", barName }) {
  if (!data?.length) return <ChartEmpty />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey={xKey} tick={axisTick} axisLine={{ stroke: "var(--chart-grid)" }} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} width={44} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          cursor={{ fill: "var(--chart-grid)" }}
        />
        <Bar dataKey={yKey} name={barName ?? yKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Smooth filled area chart. Formats ISO date strings on the X axis automatically. */
export function AreaTrend({ data, xKey, yKey, height = 220, color = "var(--chart-ink)" }) {
  if (!data?.length) return <ChartEmpty />;
  const gradientId = `area-${xKey}-${yKey}`.replace(/[^a-zA-Z0-9_-]/g, "");

  // Pre-format dates so tick labels are readable
  const formatted = data.map((d) => ({ ...d, [xKey]: fmtDate(d[xKey]) }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formatted} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey={xKey} tick={axisTick} axisLine={{ stroke: "var(--chart-grid)" }} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} width={44} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          cursor={{ stroke: "var(--chart-grid)" }}
        />
        <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Multi-series vertical bar chart. */
export function GroupedBars({ data, xKey, bars, height = 220 }) {
  if (!data?.length) return <ChartEmpty />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey={xKey} tick={axisTick} axisLine={{ stroke: "var(--chart-grid)" }} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} width={44} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          cursor={{ fill: "var(--chart-grid)" }}
        />
        {bars.map((b) => (
          <Bar key={b.key} dataKey={b.key} name={b.name} fill={b.color} radius={[6, 6, 0, 0]} maxBarSize={36} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Donut chart with an optional centered stat.
 * data: [{ name, value, color }]
 * Each slice MUST have a distinct color — otherwise Recharts renders them identically.
 */
export function DonutStat({ data, height = 180, centerLabel, centerValue }) {
  const total = (data ?? []).reduce((sum, d) => sum + (d.value || 0), 0);
  if (!total) return <ChartEmpty />;

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="60%"
            outerRadius="88%"
            paddingAngle={3}
            stroke="none"
            startAngle={90}
            endAngle={-270}
          >
            {data.map((d, i) => (
              <Cell key={`cell-${i}`} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            formatter={(value, name) => [`${value} (${((value / total) * 100).toFixed(1)}%)`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue !== undefined) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
            {centerValue}
          </span>
          <span className="text-[11px] uppercase tracking-wide text-zinc-400 mt-0.5">
            {centerLabel}
          </span>
        </div>
      )}
    </div>
  );
}

/** Legend list for DonutStat — swatch + label + value + percentage. */
export function ChartLegend({ data }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.name} className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            {d.name}
          </span>
          <span className="flex items-center gap-2 tabular-nums">
            <span className="text-zinc-400 dark:text-zinc-500 text-xs">
              {total > 0 ? `${((d.value / total) * 100).toFixed(0)}%` : "—"}
            </span>
            <span className="font-semibold text-zinc-900 dark:text-white">
              {d.value.toLocaleString()}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
