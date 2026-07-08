// format.js — small, shared display helpers so number/date formatting is
// consistent across Dashboard, URLs, Analytics, and Cache Metrics.

export function formatNumber(n) {
    if (n === null || n === undefined || Number.isNaN(n)) return "—";
    return Number(n).toLocaleString();
  }
  
  export function formatPercent(n, digits = 1) {
    if (n === null || n === undefined || Number.isNaN(n)) return "—";
    return `${Number(n).toFixed(digits)}%`;
  }
  
  export function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
  
  export function formatRelativeTime(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    const diffMs = Date.now() - d.getTime();
    const diffSec = Math.round(diffMs / 1000);
    if (diffSec < 60) return "just now";
    const diffMin = Math.round(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.round(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.round(diffHour / 24);
    if (diffDay < 30) return `${diffDay}d ago`;
    return formatDate(value);
  }
  
  export function truncate(str, max = 48) {
    if (!str) return "";
    return str.length > max ? `${str.slice(0, max - 1)}…` : str;
  }
  
  export function hostnameOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  }
  