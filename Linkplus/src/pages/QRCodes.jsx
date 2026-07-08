// QRCodes.jsx — QR Code generator and manager.
// User enters a URL → backend generates a QR PNG → displayed inline.
// No short URL is created. Analytics tracked per QR code.

import { useState, useEffect } from "react";
import { QrCode, Trash2, Download, Plus, ExternalLink, ScanLine, Clock, AlertTriangle } from "lucide-react";
import {
  createQR,
  getMyQRs,
  deleteQR,
  getQRBase64,
  downloadQRImage,
} from "../api/api";
import { PageHeader, Card, Button, ErrorBanner } from "../components/ui";
import { formatNumber } from "../lib/format";
import { formatTimeLeft, isExpired, isExpiringSoon } from "../lib/expiry";

// ── Expiry badge — ticks every minute so the countdown stays accurate ────────

function ExpiryBadge({ expiresAt, className = "" }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!expiresAt) return null;

  const expired = isExpired(expiresAt);
  const soon = isExpiringSoon(expiresAt);
  const label = expired ? "Expired" : formatTimeLeft(expiresAt);

  const tone = expired
    ? "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10"
    : soon
    ? "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10"
    : "text-zinc-500 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800";

  const Icon = expired ? AlertTriangle : Clock;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${tone} ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function QRCard({ qr, onDelete, onView }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [loadingImg, setLoadingImg] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const expired = isExpired(qr.expires_at);

  const handleExpand = async () => {
    if (!expanded && !imgSrc) {
      setLoadingImg(true);
      try {
        const data = await getQRBase64(qr.id);
        setImgSrc(data.image_b64);
      } catch {
        // silently fail — user can retry
      } finally {
        setLoadingImg(false);
      }
    }
    setExpanded((v) => !v);
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      await downloadQRImage(qr.id, `qr-${qr.id}.png`);
    } catch (err) {
      setDownloadError(err.message);
    }
  };

  return (
    <Card className="p-5 flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900 dark:text-white truncate text-sm">
            {qr.label || "Untitled QR"}
          </p>
          <a
            href={qr.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-400 hover:text-blue-500 truncate flex items-center gap-1 mt-0.5"
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            <span className="truncate">{qr.original_url}</span>
          </a>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleDownload}
            disabled={expired}
            title={expired ? "Expired — generate a new QR code" : "Download PNG"}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(qr.id)}
            title="Delete"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scan count + expiry */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <ScanLine className="w-3.5 h-3.5" />
          <span>{formatNumber(qr.scan_count ?? 0)} scans</span>
        </div>
        <ExpiryBadge expiresAt={qr.expires_at} />
      </div>

      {downloadError && (
        <p className="text-xs text-rose-500">{downloadError}</p>
      )}

      {/* Toggle QR image */}
      <button
        onClick={handleExpand}
        disabled={expired}
        className="text-xs font-medium text-blue-500 hover:text-blue-600 text-left disabled:text-zinc-400 disabled:cursor-not-allowed"
      >
        {expired ? "QR code expired" : expanded ? "Hide QR code" : "Show QR code"}
      </button>

      {expanded && (
        <div className="flex justify-center">
          {loadingImg ? (
            <div className="w-40 h-40 flex items-center justify-center rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <div className="w-6 h-6 rounded-full border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-white animate-spin" />
            </div>
          ) : imgSrc ? (
            <img
              src={imgSrc}
              alt="QR code"
              className="w-40 h-40 rounded-xl border border-zinc-100 dark:border-zinc-800"
            />
          ) : (
            <p className="text-xs text-zinc-400">Failed to load image.</p>
          )}
        </div>
      )}
    </Card>
  );
}

export default function QRCodes() {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [qrs, setQRs] = useState([]);
  const [latestQR, setLatestQR] = useState(null); // {image_b64, original_url, id}
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQRs = () =>
      getMyQRs()
        .then((list) => setQRs(list ?? []))
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));

    fetchQRs();
    // Poll every 15 seconds so scan_count updates live without a manual refresh
    const timer = setInterval(fetchQRs, 15_000);
    return () => clearInterval(timer);
  }, []);

  const handleCreate = async () => {
    if (!url.trim()) return;
    setCreating(true);
    setError(null);
    setLatestQR(null);
    try {
      const data = await createQR(url.trim(), label.trim());
      setLatestQR(data);
      setQRs((prev) => [
        { id: data.id, original_url: data.original_url, label: data.label, scan_count: 0, expires_at: data.expires_at },
        ...prev,
      ]);
      setUrl("");
      setLabel("");
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteQR(id);
      setQRs((prev) => prev.filter((q) => q.id !== id));
      if (latestQR?.id === id) setLatestQR(null);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDownloadLatest = () => {
    if (!latestQR?.image_b64) return;
    const a = document.createElement("a");
    a.href = latestQR.image_b64;
    a.download = `qr-${latestQR.id}.png`;
    a.click();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="QR Code Generator"
        description="Generate QR codes that link directly to any URL. No short link created."
      />

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {/* ── Generator card ── */}
      <Card className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h2 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            Generate a new QR code
          </h2>
          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
            <Clock className="w-3.5 h-3.5" />
            Codes expire 6 hours after creation
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Destination URL <span className="text-rose-400">*</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="https://example.com/your-page"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900
                         px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400
                         focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Label (optional)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="e.g. Product Launch Campaign"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900
                         px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400
                         focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white/30"
            />
          </div>

          <Button onClick={handleCreate} disabled={creating || !url.trim()} className="w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            {creating ? "Generating…" : "Generate QR Code"}
          </Button>
        </div>

        {/* ── Freshly generated QR preview ── */}
        {latestQR && (
          <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center gap-6">
            <img
              src={latestQR.image_b64}
              alt="Generated QR code"
              className="w-48 h-48 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm"
            />
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs text-zinc-400 mb-0.5">QR code ready</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {latestQR.label || "Untitled QR"}
                </p>
                <a
                  href={latestQR.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline truncate block max-w-xs"
                >
                  {latestQR.original_url}
                </a>
              </div>

              {/* Expiry notice — the main call-out so users know to save it */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  This QR code expires in <span className="font-semibold">6 hours</span>
                  {latestQR.expires_at && (
                    <> ({formatTimeLeft(latestQR.expires_at)}). </>
                  )}
                  {" "}Download it now or generate a new one after it lapses.
                </p>
              </div>

              <Button onClick={handleDownloadLatest} variant="outline" size="sm">
                <Download className="w-3.5 h-3.5" />
                Download PNG
              </Button>
              <p className="text-xs text-zinc-400">
                This QR code encodes your URL directly — scanning it redirects
                to your destination without any intermediate short link.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* ── QR code library ── */}
      <div>
        <h2 className="font-semibold text-zinc-900 dark:text-white mb-4">
          Your QR codes
          {!loading && (
            <span className="ml-2 text-xs font-normal text-zinc-400">
              ({qrs.length})
            </span>
          )}
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-36 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 animate-pulse"
              />
            ))}
          </div>
        ) : qrs.length === 0 ? (
          <Card className="p-10 text-center">
            <QrCode className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No QR codes yet. Generate one above to get started.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {qrs.map((qr) => (
              <QRCard key={qr.id} qr={qr} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}