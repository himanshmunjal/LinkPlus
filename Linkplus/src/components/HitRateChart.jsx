// HitRateChart.jsx
// Renders a bar chart of daily clicks for a selected short code.
// Also used to show cache hit/miss breakdown when passed cacheMode=true.

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
  } from "recharts";
  
  /**
   * Props:
   *  data        – array of { date, clicks } OR { label, hits, misses } when cacheMode
   *  cacheMode   – if true, renders a two-bar chart (hits vs misses)
   *  title       – optional heading
   *  loading     – show skeleton while loading
   */
  export default function HitRateChart({ data = [], cacheMode = false, title, loading = false }) {
    if (loading) {
      return (
        <div className="rounded-2xl border border-slate-200 p-5 animate-pulse">
          <div className="h-4 w-40 bg-slate-200 rounded mb-4" />
          <div className="h-48 bg-slate-100 rounded" />
        </div>
      );
    }
  
    if (!data.length) {
      return (
        <div className="rounded-2xl border border-slate-200 p-5 text-center text-slate-400 text-sm py-16">
          No data available yet.
        </div>
      );
    }
  
    return (
      <div className="rounded-2xl border border-slate-200 p-5">
        {title && (
          <p className="text-sm font-semibold text-slate-600 mb-4">{title}</p>
        )}
        <ResponsiveContainer width="100%" height={220}>
          {cacheMode ? (
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="hits"   fill="#6366f1" radius={[4, 4, 0, 0]} name="Hits" />
              <Bar dataKey="misses" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Misses" />
            </BarChart>
          ) : (
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="clicks" fill="#6366f1" radius={[4, 4, 0, 0]} name="Clicks" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    );
  }