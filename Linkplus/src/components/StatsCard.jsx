// StatsCard.jsx — a metric card used across Dashboard, Analytics, and
// Cache Metrics. Monochrome by default; `tone` adds a small semantic accent
// only where it communicates something real (success = healthy, danger =
// needs attention).

import { Card } from "./ui";

const tones = {
  neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  danger: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
};

export default function StatsCard({ label, value, sub, icon: Icon, tone = "neutral" }) {
  return (
    <Card className="p-5 flex items-start gap-4">
      {Icon && (
        <span className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${tones[tone]}`}>
          <Icon className="w-4.5 h-4.5" strokeWidth={1.75} />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 truncate">
          {label}
        </p>
        <p className="text-2xl font-bold mt-1 tabular-nums text-zinc-900 dark:text-white">
          {value ?? "—"}
        </p>
        {sub && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 truncate">{sub}</p>}
      </div>
    </Card>
  );
}
