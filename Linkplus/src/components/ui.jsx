// ui.jsx
// Small, shared design-system primitives used across every page so the app
// reads as one consistent product rather than a pile of one-off styles.
// Palette is intentionally monochrome (zinc/black/white) — color is reserved
// for semantic states only (emerald = success/hit, rose = danger/miss/delete).

import { forwardRef } from "react";

// ── Button ──────────────────────────────────────────────────────────────────

const buttonVariants = {
  primary:
    "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200",
  outline:
    "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/60",
  ghost:
    "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/60",
  danger:
    "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10",
};

const buttonSizes = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-4 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-5 py-3 text-sm rounded-xl gap-2",
};

export const Button = forwardRef(
  ({ variant = "primary", size = "md", className = "", type = "button", children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center font-semibold transition-colors
                  disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap
                  ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = "Button";

// ── Icon button (square, for topbar / toolbars) ────────────────────────────

export const IconButton = forwardRef(
  ({ className = "", children, label, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg
                  text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900
                  dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white
                  transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  )
);
IconButton.displayName = "IconButton";

// ── Card ────────────────────────────────────────────────────────────────────

export function Card({ children, className = "", as: Tag = "div", ...props }) {
  return (
    <Tag
      className={`rounded-2xl border border-zinc-200 bg-white
                  dark:border-zinc-800 dark:bg-zinc-900/40 ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

// ── Badge ───────────────────────────────────────────────────────────────────

const badgeTones = {
  neutral: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  danger: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
  outline:
    "border border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300",
};

export function Badge({ tone = "neutral", className = "", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]
                  font-semibold uppercase tracking-wide ${badgeTones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

// ── Input ───────────────────────────────────────────────────────────────────

export const Input = forwardRef(({ className = "", error, ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full rounded-xl border px-4 py-3 text-sm transition-colors
                bg-white text-zinc-900 placeholder:text-zinc-400 border-zinc-300
                focus:outline-none focus:ring-2 focus:ring-zinc-900/15 focus:border-zinc-400
                dark:bg-black/40 dark:text-white dark:placeholder:text-zinc-600
                dark:focus:ring-white/20 dark:focus:border-zinc-500
                ${error ? "border-rose-400 dark:border-rose-500/60" : "dark:border-zinc-700"}
                ${className}`}
    {...props}
  />
));
Input.displayName = "Input";

// ── Skeleton ────────────────────────────────────────────────────────────────

export function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800/60 ${className}`}
    />
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700">
      {icon && (
        <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {icon}
        </div>
      )}
      <p className="font-semibold text-zinc-800 dark:text-zinc-100">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── Inline error banner ─────────────────────────────────────────────────────

export function ErrorBanner({ children }) {
  if (!children) return null;
  return (
    <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-300">
      {children}
    </div>
  );
}

// ── Section header (title + subtitle, used at the top of every page) ──────

export function PageHeader({ title, description, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
