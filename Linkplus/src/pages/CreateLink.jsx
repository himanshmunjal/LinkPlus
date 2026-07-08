// CreateLink.jsx
import { useState } from "react";
import { createURL, shortURL } from "../api/api";

export default function CreateLink() {
  const [input, setInput]     = useState("");
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await createURL(input.trim());
      setResult(data);
      setInput("");
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
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Shorten a URL</h1>
      <p className="text-slate-500 text-sm mb-6">
        Paste any long link and get a compact, trackable short URL instantly.
      </p>

      {/* Input row */}
      <div className="flex gap-2">
        <input
          type="url"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="https://example.com/very/long/url"
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm
                     focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
                     placeholder:text-slate-400"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
          className="px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold
                     hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
        >
          {loading ? "Creating…" : "Shorten"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="mt-3 text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-2">
          {error}
        </p>
      )}

      {/* Success result */}
      {result && (
        <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-3">
            Your short link
          </p>

          <div className="flex items-center gap-3">
            <a
              href={shortURL(result.short_code)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-700 font-mono font-semibold text-lg hover:underline break-all"
            >
              {shortURL(result.short_code)}
            </a>
            <button
              onClick={handleCopy}
              className="ml-auto shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg
                         bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500 truncate">
            ↳ {result.original_url}
          </p>
        </div>
      )}
    </div>
  );
}