// App.jsx — V3: adds QR Codes page.

import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Logo from "./components/Logo";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import URLs from "./pages/URLs";
import Analytics from "./pages/Analytics";
import CacheMetrics from "./pages/CacheMetrics";
import Architecture from "./pages/Architecture";
import QRCodes from "./pages/QRCodes";

function SplashScreen() {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Logo size="lg" />
        <div className="w-5 h-5 rounded-full border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-white animate-spin" />
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
      <span className="text-4xl">🔒</span>
      <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">Admin access required</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Cache Metrics are only visible to administrators.
      </p>
    </div>
  );
}

function Inner() {
  const { isLoggedIn, checkingSession, isAdmin } = useAuth();
  const [authPage, setAuthPage] = useState("login");
  const [page, setPage] = useState(() => localStorage.getItem("current_page") ?? "dashboard");
  const [search, setSearch] = useState("");

  if (checkingSession) return <SplashScreen />;

  if (!isLoggedIn) {
    if (authPage === "signup") {
      return <Signup onSuccess={() => setPage("dashboard")} onGoLogin={() => setAuthPage("login")} />;
    }
    return <Login onSuccess={() => setPage("dashboard")} onGoSignup={() => setAuthPage("signup")} />;
  }

  const navigate = (p) => {
    setPage(p);
    localStorage.setItem("current_page", p);
  };

  return (
    <AppLayout currentPage={page} onNavigate={navigate} search={search} onSearchChange={setSearch}>
      {page === "dashboard"    && <Dashboard onNavigate={navigate} />}
      {page === "urls"         && <URLs search={search} />}
      {page === "qrcodes"     && <QRCodes />}
      {page === "analytics"   && <Analytics />}
      {page === "cache"        && (isAdmin ? <CacheMetrics /> : <AccessDenied />)}
      {page === "architecture" && <Architecture />}
    </AppLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Inner />
      </AuthProvider>
    </ThemeProvider>
  );
}