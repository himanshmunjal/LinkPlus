// AuthContext.jsx
// Provides authentication state (user, token, role) globally via React context.

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { getMe } from "../api/api";

const AuthContext = createContext(null);

const TOKEN_KEY = "access_token";
const USER_KEY  = "url_shortner_user"; 
const REFRESH_TOKEN_KEY = "refresh_token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? null);
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [checkingSession, setCheckingSession] = useState(() => !!localStorage.getItem(TOKEN_KEY));
  const loggingOutRef = useRef(false);

  const saveAuth = useCallback((authResponse) => {
    const { token, refresh_token, user } = authResponse; // Added refresh_token
    localStorage.setItem(TOKEN_KEY, token);
    if (refresh_token) localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setToken(token);
    setUser(user);
  }, []);
  
  // Update logout to clear everything:
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // On first load, confirm the stored token is still valid.
  useEffect(() => {
    if (!token) {
      setCheckingSession(false);
      return;
    }
    let cancelled = false;
    getMe()
      .then((me) => {
        if (cancelled) return;
        setUser((prev) => ({
          id:       me.user_id  ?? prev?.id,
          username: me.username ?? prev?.username,
          email:    me.email    ?? prev?.email,
          role:     me.role     ?? prev?.role ?? "user",
        }));
      })
      .catch(() => {
        if (!cancelled) logout();
      })
      .finally(() => {
        if (!cancelled) setCheckingSession(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const onRefreshed = (e) => {
      setToken(e.detail);
    };
    window.addEventListener("auth:refreshed", onRefreshed);
    return () => window.removeEventListener("auth:refreshed", onRefreshed);
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      logout();
      setTimeout(() => { loggingOutRef.current = false; }, 500);
    };
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, [logout]);

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{ token, user, saveAuth, logout, isLoggedIn: !!token, checkingSession, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
