// Navbar.jsx
// Responsive top navigation bar.
// Reads auth state from AuthContext — shows user info + sign out when logged in.
//
// Props:
//   currentPage  – "dashboard" | "analytics"  (active tab highlight)
//   onNavigate   – (page: string) => void      (called on nav link click)

import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ currentPage, onNavigate }) {
  const { isLoggedIn, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { key: "dashboard", label: "Dashboard", icon: "⚡" },
    { key: "analytics", label: "Analytics",  icon: "📊" },
  ];

  const handleNav = (key) => {
    onNavigate?.(key);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4">
        <div className="h-14 flex items-center gap-4">

          {/* ── Wordmark ──────────────────────────────────────────────── */}
          <button
            onClick={() => handleNav("dashboard")}
            className="flex items-center gap-2 font-bold text-slate-800 text-lg
                       tracking-tight shrink-0 hover:opacity-80 transition-opacity"
          >
            <span className="text-xl">🔗</span>
            <span>LinkSnip</span>
          </button>

          {/* ── Desktop nav links (only when logged in) ───────────────── */}
          {isLoggedIn && (
            <nav className="hidden sm:flex items-center gap-1 ml-2">
              {navLinks.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => handleNav(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                              font-medium transition-colors ${
                                currentPage === key
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                              }`}
                >
                  <span className="text-base">{icon}</span>
                  {label}
                </button>
              ))}
            </nav>
          )}

          {/* ── Spacer ───────────────────────────────────────────────── */}
          <div className="flex-1" />

          {/* ── Desktop right side ────────────────────────────────────── */}
          {isLoggedIn ? (
            <div className="hidden sm:flex items-center gap-3">
              {/* User badge */}
              <div className="flex items-center gap-2 bg-slate-100 rounded-full
                              pl-1 pr-3 py-1">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs
                                 font-bold flex items-center justify-center uppercase">
                  {user?.username?.[0] ?? "U"}
                </span>
                <span className="text-sm font-medium text-slate-700 max-w-[120px] truncate">
                  {user?.username}
                </span>
              </div>

              {/* Sign out */}
              <button
                onClick={handleLogout}
                className="text-sm px-3 py-1.5 rounded-lg border border-slate-200
                           text-slate-600 hover:bg-slate-100 transition-colors font-medium"
              >
                Sign out
              </button>
            </div>
          ) : (
            /* Not logged in — show auth buttons */
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => handleNav("login")}
                className="text-sm px-3 py-1.5 rounded-lg text-slate-600
                           hover:bg-slate-100 transition-colors font-medium"
              >
                Sign in
              </button>
              <button
                onClick={() => handleNav("signup")}
                className="text-sm px-4 py-1.5 rounded-lg bg-indigo-600 text-white
                           hover:bg-indigo-700 transition-colors font-semibold"
              >
                Get started
              </button>
            </div>
          )}

          {/* ── Mobile hamburger ──────────────────────────────────────── */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            className="sm:hidden flex flex-col gap-1.5 p-2 rounded-lg
                       hover:bg-slate-100 transition-colors"
          >
            <span className={`block w-5 h-0.5 bg-slate-600 transition-transform duration-200
                              ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-5 h-0.5 bg-slate-600 transition-opacity duration-200
                              ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-0.5 bg-slate-600 transition-transform duration-200
                              ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ─────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-slate-100 bg-white px-4 pb-4 pt-2 space-y-1">

          {isLoggedIn && (
            <>
              {/* User info row */}
              <div className="flex items-center gap-2 px-3 py-2 mb-2">
                <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs
                                 font-bold flex items-center justify-center uppercase shrink-0">
                  {user?.username?.[0] ?? "U"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {user?.username}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
              </div>

              {navLinks.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => handleNav(key)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl
                              text-sm font-medium text-left transition-colors ${
                                currentPage === key
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "text-slate-600 hover:bg-slate-100"
                              }`}
                >
                  <span>{icon}</span>
                  {label}
                </button>
              ))}

              <div className="pt-2 border-t border-slate-100 mt-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl
                             text-sm font-medium text-rose-600 hover:bg-rose-50
                             transition-colors text-left"
                >
                  <span>🚪</span>
                  Sign out
                </button>
              </div>
            </>
          )}

          {!isLoggedIn && (
            <>
              <button
                onClick={() => handleNav("login")}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-medium
                           text-slate-600 hover:bg-slate-100 transition-colors text-left"
              >
                Sign in
              </button>
              <button
                onClick={() => handleNav("signup")}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold
                           bg-indigo-600 text-white hover:bg-indigo-700
                           transition-colors text-left"
              >
                Get started
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}