// TopLinksTable.jsx — ranked list of the user's top-performing links, with
// a "View" action that loads that link's daily-click chart.

import { Skeleton, EmptyState, Button } from "./ui";
import { formatNumber, truncate } from "../lib/format";
import { BarChart3 } from "lucide-react";

export default function TopLinksTable({ links, loading, selectedCode, onSelect }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-11" />
        ))}
      </div>
    );
  }

  if (!links?.length) {
    return (
      <EmptyState
        icon={<BarChart3 className="w-5 h-5" />}
        title="No click data yet"
        description="Once your links start getting clicked, rankings will show up here."
      />
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-500 text-[11px] uppercase tracking-wide dark:bg-zinc-900/60 dark:text-zinc-500">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">#</th>
              <th className="text-left px-4 py-3 font-semibold">Short code</th>
              <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Destination</th>
              <th className="text-right px-4 py-3 font-semibold">Clicks</th>
              <th className="text-right px-4 py-3 font-semibold">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {links.map((row, i) => (
              <tr
                key={row.short_code}
                className={`transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50 ${
                  selectedCode === row.short_code ? "bg-zinc-50 dark:bg-zinc-900/60" : ""
                }`}
              >
                <td className="px-4 py-3 text-zinc-400 tabular-nums">{i + 1}</td>
                <td className="px-4 py-3 font-mono font-semibold text-zinc-900 dark:text-white">
                  {row.short_code}
                </td>
                <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 hidden md:table-cell max-w-xs truncate">
                  {truncate(row.original_url, 56)}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-zinc-900 dark:text-white">
                  {formatNumber(row.click_count ?? 0)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant={selectedCode === row.short_code ? "primary" : "outline"}
                    size="sm"
                    onClick={() => onSelect(row.short_code)}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}