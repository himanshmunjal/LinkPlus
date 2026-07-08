// Topbar.jsx — sticky header: sidebar collapse toggle, global search box,
// theme toggle, and a user menu with sign out.

import { useEffect, useRef, useState } from "react";
import { Search, PanelLeft, Menu, Sun, Moon, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { IconButton } from "./ui";

export default function Topbar({ onOpenMobile, onToggleCollapse, search, onSearchChange }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initial = (user?.username?.[0] ?? "U").toUpperCase();

  return (
    <header className="sticky top-0 z-20 h-16 flex items-center gap-2 px-4 sm:px-6 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-black/70">
      <IconButton label="Open menu" onClick={onOpenMobile} className="lg:hidden">
        <Menu className="w-[18px] h-[18px]" />
      </IconButton>

      <IconButton label="Collapse sidebar" onClick={onToggleCollapse} className="hidden lg:inline-flex">
        <PanelLeft className="w-[18px] h-[18px]" />
      </IconButton>

      <div className="flex-1 max-w-md ml-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search links, keys, events…"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 py-2 text-sm
                       text-zinc-700 placeholder:text-zinc-400
                       focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:bg-white
                       dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200
                       dark:placeholder:text-zinc-500 dark:focus:ring-white/10 dark:focus:bg-zinc-900"
          />
        </div>
      </div>

      <div className="flex-1" />

      <IconButton label={isDark ? "Switch to light theme" : "Switch to dark theme"} onClick={toggleTheme}>
        {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
      </IconButton>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="w-9 h-9 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-black
                     text-xs font-bold flex items-center justify-center uppercase
                     hover:opacity-85 transition-opacity"
        >
          {initial}
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-200 bg-white shadow-lg
                       dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                {user?.username}
              </p>
              <p className="text-xs text-zinc-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-rose-600
                         hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
