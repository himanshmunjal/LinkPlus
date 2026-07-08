// URLs.jsx — full link management: create, browse, search, and delete.

import { useCallback, useEffect, useMemo, useState } from "react";
import { getMyURLs, deleteURL } from "../api/api";
import { PageHeader, Card, Button } from "../components/ui";
import CreateLinkForm from "../components/CreateLinkForm";
import LinkTable from "../components/LinkTable";
import { formatNumber } from "../lib/format";

const SORTS = {
  newest: (a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt),
  clicks: (a, b) => (b.click_count ?? 0) - (a.click_count ?? 0),
};

export default function URLs({ search = "" }) {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [sort, setSort] = useState("newest");

  const fetchURLs = useCallback(() => {
    setLoading(true);
    setError(null);
    getMyURLs()
      .then((data) => setUrls(data ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchURLs();
    // Poll every 15 seconds so click counts update automatically
    // without requiring a manual refresh.
    const timer = setInterval(fetchURLs, 15_000);
    return () => clearInterval(timer);
  }, [fetchURLs]);

  const handleDelete = async (code) => {
    if (!window.confirm(`Delete /${code}? This can't be undone.`)) return;
    setDeleting(code);
    try {
      await deleteURL(code);
      setUrls((prev) => prev.filter((u) => u.short_code !== code));
    } catch (e) {
      window.alert(e.message);
    } finally {
      setDeleting(null);
    }
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? urls.filter(
          (u) =>
            u.short_code.toLowerCase().includes(q) || u.original_url.toLowerCase().includes(q)
        )
      : urls;
    return [...filtered].sort(SORTS[sort]);
  }, [urls, search, sort]);

  return (
    <div className="space-y-8">
      <PageHeader title="URLs" description="Create, track, and manage every link you've shortened." />

      <Card className="p-6">
        <CreateLinkForm onCreated={fetchURLs} />
      </Card>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            {loading ? "Loading…" : `${formatNumber(visible.length)} link${visible.length === 1 ? "" : "s"}`}
            {search && !loading ? ` matching “${search}”` : ""}
          </p>
          <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1">
            {[
              { key: "newest", label: "Newest" },
              { key: "clicks", label: "Most clicks" },
            ].map((opt) => (
              <Button
                key={opt.key}
                size="sm"
                variant={sort === opt.key ? "primary" : "ghost"}
                onClick={() => setSort(opt.key)}
                className={sort === opt.key ? "" : "dark:hover:bg-zinc-800"}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <LinkTable urls={visible} loading={loading} error={error} onDelete={handleDelete} deleting={deleting} />
      </div>
    </div>
  );
}