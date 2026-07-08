// Sidebar.jsx — fixed left navigation. Admin users see Cache Metrics;
// regular users do not.

import { X } from "lucide-react";
import Logo from "./Logo";
import { getNavItems } from "../lib/nav";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ currentPage, onNavigate, collapsed, mobileOpen, onCloseMobile }) {
  const { isAdmin } = useAuth();
  const navItems = getNavItems(isAdmin);

  const handleNav = (key) => {
    onNavigate(key);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed z-40 inset-y-0 left-0 flex flex-col border-r border-zinc-200 bg-white
                    dark:border-zinc-800 dark:bg-black
                    transition-transform duration-200 lg:translate-x-0
                    ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
                    ${collapsed ? "w-20" : "w-64"}`}
      >
        <div className={`flex items-center h-16 px-4 ${collapsed ? "justify-center" : "justify-between"}`}>
          <Logo collapsed={collapsed} />
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {!collapsed && (
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Platform
            </p>
          )}
          {navItems.map(({ key, label, icon: Icon }) => {
            const active = currentPage === key;
            return (
              <button
                key={key}
                onClick={() => handleNav(key)}
                title={collapsed ? label : undefined}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium
                            transition-colors ${collapsed ? "justify-center" : ""}
                            ${
                              active
                                ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-white"
                            }`}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
                {!collapsed && <span className="truncate">{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Role badge at bottom */}
        {!collapsed && (
          <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold
                ${isAdmin
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
            >
              {isAdmin ? "Admin" : "User"}
            </span>
          </div>
        )}
      </aside>
    </>
  );
}
