// AppLayout.jsx — the authenticated app shell: sidebar + topbar + content.
// Owns the sidebar's collapsed/mobile-open state; search state is lifted to
// App.jsx since only some pages (URLs) act on it.

import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout({ currentPage, onNavigate, search, onSearchChange, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className={`flex flex-col min-h-screen transition-[margin] duration-200 ${collapsed ? "lg:ml-20" : "lg:ml-64"}`}>
        <Topbar
          onOpenMobile={() => setMobileOpen(true)}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          search={search}
          onSearchChange={onSearchChange}
        />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
