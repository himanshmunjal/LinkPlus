// LinkTable.jsx — renders a user's shortened links. Shared by the URLs page
// (full table with delete) and the Dashboard (compact preview).

import { useState } from "react";
import { Copy, Check, ExternalLink, Trash2 } from "lucide-react";
import { shortURL } from "../api/api";
import { Skeleton, EmptyState, Button } from "./ui";
import { formatNumber, formatRelativeTime, truncate } from "../lib/format";
import { Link2 } from "lucide-react";

function CopyButton({ code }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(shortURL(code));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      title="Copy short link"
      className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700
                 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function LinkTable({
  urls,
  loading,
  error,
  onDelete,
  deleting,
  compact = false,
  emptyAction,
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(compact ? 3 : 5)].map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-300">
        {error}
      </div>
    );
  }

  if (!urls?.length) {
    return (
      <EmptyState
        icon={<Link2 className="w-5 h-5" />}
        title="No links yet"
        description="Shorten your first URL above and it'll show up here."
        action={emptyAction}
      />
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-500 text-[11px] uppercase tracking-wide dark:bg-zinc-900/60 dark:text-zinc-500">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Short link</th>
              <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Destination</th>
              {!compact && <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Created</th>}
              <th className="text-right px-4 py-3 font-semibold">Clicks</th>
              <th className="text-right px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {urls.map((u) => (
              <tr
                key={u.short_code}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <a
                      href={shortURL(u.short_code)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-semibold text-zinc-900 dark:text-white hover:underline flex items-center gap-1"
                    >
                      /{u.short_code}
                      <ExternalLink className="w-3 h-3 opacity-40" />
                    </a>
                    <CopyButton code={u.short_code} />
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 hidden md:table-cell max-w-xs truncate">
                  {truncate(u.original_url, 56)}
                </td>
                {!compact && (
                  <td className="px-4 py-3 text-zinc-400 dark:text-zinc-500 hidden sm:table-cell whitespace-nowrap">
                    {formatRelativeTime(u.CreatedAt)}
                  </td>
                )}
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-zinc-900 dark:text-white">
                  {formatNumber(u.click_count ?? 0)}
                </td>
                <td className="px-4 py-3 text-right">
                  {onDelete && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onDelete(u.short_code)}
                      disabled={deleting === u.short_code}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {deleting === u.short_code ? "" : ""}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
