// CreateLinkForm.jsx — shortens a URL. Used standalone on the URLs page and
// in a compact variant on the Dashboard for quick access.

import { useState } from "react";
import { Copy, Check, ExternalLink, Link2 } from "lucide-react";
import { createURL, shortURL } from "../api/api";
import { Input, Button, ErrorBanner } from "./ui";

export default function CreateLinkForm({ onCreated, compact = false }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiryWindow, setExpiryWindow] = useState("");

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
  
    try {
      const expiresIn = expiryWindow ? parseInt(expiryWindow, 10) : 0;
      const data = await createURL(input.trim(), expiresIn);
      setResult(data);
      setInput("");
      setExpiryWindow(""); // ← also clear expiry after success
      onCreated?.(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(shortURL(result.short_code));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div>
      {!compact && (
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Shorten a URL</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Paste any long link and get a compact, trackable short URL instantly.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <Input
            type="url"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://example.com/very/long/url"
            required
          />
        </div>
        <div>
        <Input
          type="number"
          min="1"
          value={expiryWindow}
          onChange={(e) => setExpiryWindow(e.target.value)}  // ← string, not number
          placeholder="Expiry in hours (optional)"
        />
        </div>
        <Button type="submit" disabled={loading || !input.trim()} className="shrink-0">
          <Link2 className="w-4 h-4" />
          {loading ? "Creating…" : "Shorten"}
        </Button>
      </form>

      {error && (
        <div className="mt-3">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
            Your short link
          </p>
          <div className="flex items-center gap-3">
            <a
              href={shortURL(result.short_code)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-mono text-sm sm:text-base font-semibold text-zinc-900 dark:text-white hover:underline break-all"
            >
              {shortURL(result.short_code)}
              <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-50" />
            </a>
            <Button variant="outline" size="sm" onClick={handleCopy} className="ml-auto shrink-0">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 truncate">
            ↳ {result.original_url}
          </p>
        </div>
      )}
    </div>
  );
}