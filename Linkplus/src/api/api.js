// // api.js — all API calls for the URL Shortener frontend.

// const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

// const ACCESS_TOKEN_KEY = "access_token";
// const REFRESH_TOKEN_KEY = "refresh_token";

// function getAccessToken() {
//   return localStorage.getItem(ACCESS_TOKEN_KEY);
// }

// function getRefreshToken() {
//   return localStorage.getItem(REFRESH_TOKEN_KEY);
// }

// export function saveAuth(data) {
//   localStorage.setItem(ACCESS_TOKEN_KEY, data.token);
//   localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
// }

// export function clearAuth() {
//   localStorage.removeItem(ACCESS_TOKEN_KEY);
//   localStorage.removeItem(REFRESH_TOKEN_KEY);
// }

// async function refreshAccessToken() {
//   const refreshToken = getRefreshToken();

//   if (!refreshToken) {
//     throw new Error("No refresh token available");
//   }

//   const res = await fetch(`${BASE}/api/v1/auth/refresh`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       refresh_token: refreshToken,
//     }),
//   });

//   if (!res.ok) {
//     clearAuth();
//     throw new Error("Session expired");
//   }

//   const data = await res.json();

//   localStorage.setItem(
//     ACCESS_TOKEN_KEY,
//     data.access_token
//   );

//   localStorage.setItem(
//     REFRESH_TOKEN_KEY,
//     data.refresh_token
//   );

//   window.dispatchEvent(new CustomEvent("auth:refreshed", { detail: data.access_token }));
//   return data.access_token;
// }

// async function request(path, options = {}, requiresAuth = false) {
//   const headers = {
//     "Content-Type": "application/json",
//     ...options.headers,
//   };

//   if (requiresAuth) {
//     const token = getAccessToken();

//     if (!token) {
//       throw new Error("Not authenticated");
//     }

//     headers["Authorization"] = `Bearer ${token}`;
//   }

//   let res = await fetch(`${BASE}${path}`, {
//     ...options,
//     headers,
//   });

//   // Access token expired → try refresh
//   if (res.status === 401 && requiresAuth) {
//     try {
//       const newAccessToken = await refreshAccessToken();

//       headers["Authorization"] = `Bearer ${newAccessToken}`;

//       res = await fetch(`${BASE}${path}`, {
//         ...options,
//         headers,
//       });
//     } catch (err) {
//       clearAuth();
//       window.dispatchEvent(new Event("auth:unauthorized"));
//       throw err;
//     }
//   }

//   if (!res.ok) {
//     const body = await res.json().catch(() => ({}));

//     throw new Error(
//       body.error ?? `HTTP ${res.status}`
//     );
//   }

//   return res.json();
// }

// // Auth

// export const signup = (username, email, password) => request("/api/v1/auth/signup", {
//     method: "POST",
//     body: JSON.stringify({
//       username,
//       email,
//       password,
//     }),
//   });

// export const login = (email, password) => request("/api/v1/auth/login", {
//     method: "POST",
//     body: JSON.stringify({
//       email,
//       password,
//     }),
//   });

// export const getMe = () => request("/api/v1/auth/me", {}, true);

// // Short URL

// export const createURL = (url, expiresIn) =>
//   request(
//     "/api/v1/url",
//     {
//       method: "POST",
//       body: JSON.stringify({
//         url,
//         expires_in: expiresIn || 0,
//       }),
//     },
//     true
//   );

// export const getMyURLs = () => request("/api/v1/url", {}, true);

// export const deleteURL = (code) => request(`/api/v1/url/${code}`, { method: "DELETE" }, true);

// // Short URL Analytics

// export const getTopLinks = () => request("/api/v1/analytics/top", {}, true);

// export const getDailyClicks = (code) => request(`/api/v1/analytics/daily/${code}`, {}, true);

// export const getTotalClicks = () => request("/api/v1/analytics/total", {}, true);

// export const getMyTotalClicks = () => request("/api/v1/analytics/total/me", {}, true);

// export const getDailyClicksByUser = () => request("/api/v1/analytics/daily", {}, true);

// // QR Code

// export const createQR   = (url, label) => request("/api/v1/qr", { method: "POST", body: JSON.stringify({ url, label: label || "" }) }, true);

// export const getMyQRs   = () => request("/api/v1/qr", {}, true);

// export const getQRBase64 = (id) => request(`/api/v1/qr/${id}/base64`, {}, true);

// export const deleteQR   = (id) => request(`/api/v1/qr/${id}`, { method: "DELETE" }, true);

// export const getQRImageURL = (id) => `${BASE}/api/v1/qr/${id}/image`;

// // QR Analytics

// export const getQRDailyScans    = ()   => request("/api/v1/qr/analytics/daily",     {}, true);

// export const getQRDailyScansByID = (id) => request(`/api/v1/qr/analytics/daily/${id}`, {}, true);

// export const getQRDeviceBreakdown = ()  => request("/api/v1/qr/analytics/devices",  {}, true);

// export const getQRTotalScans    = ()   => request("/api/v1/qr/analytics/total",     {}, true);

// // Admin

// export const getCacheStats = () => request("/api/v1/admin/cache/stats", {}, true);

// export const shortURL = (code) => `${BASE}/r/${code}`;

// api.js — all API calls for LinkPlus V3.

const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

const ACCESS_TOKEN_KEY  = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

function getAccessToken()  { return localStorage.getItem(ACCESS_TOKEN_KEY);  }
function getRefreshToken() { return localStorage.getItem(REFRESH_TOKEN_KEY); }

export function saveAuth(data) {
  localStorage.setItem(ACCESS_TOKEN_KEY,  data.token);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available");

  const res = await fetch(`${BASE}/api/v4/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) { clearAuth(); throw new Error("Session expired"); }

  const data = await res.json();
  localStorage.setItem(ACCESS_TOKEN_KEY,  data.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
  window.dispatchEvent(new CustomEvent("auth:refreshed", { detail: data.access_token }));
  return data.access_token;
}

async function request(path, options = {}, requiresAuth = false) {
  const headers = { "Content-Type": "application/json", ...options.headers };

  if (requiresAuth) {
    const token = getAccessToken();
    if (!token) throw new Error("Not authenticated");
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401 && requiresAuth) {
    try {
      const newToken = await refreshAccessToken();
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${BASE}${path}`, { ...options, headers });
    } catch (err) {
      clearAuth();
      window.dispatchEvent(new Event("auth:unauthorized"));
      throw err;
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const signup = (username, email, password) =>
  request("/api/v4/auth/signup", { method: "POST", body: JSON.stringify({ username, email, password }) });

export const login = (email, password) =>
  request("/api/v4/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const getMe = () => request("/api/v4/auth/me", {}, true);

// ── Short URLs ────────────────────────────────────────────────────────────────

export const createURL = (url, expiresIn) =>
  request("/api/v4/url", { method: "POST", body: JSON.stringify({ url, expires_in: expiresIn || 0 }) }, true);

export const getMyURLs  = () => request("/api/v4/url", {}, true);
export const deleteURL  = (code) => request(`/api/v4/url/${code}`, { method: "DELETE" }, true);
export const shortURL   = (code) => `${BASE}/r/${code}`;

// ── Short URL Analytics ───────────────────────────────────────────────────────

export const getTopLinks           = ()     => request("/api/v4/analytics/top",          {}, true);
export const getDailyClicks        = (code) => request(`/api/v4/analytics/daily/${code}`, {}, true);
export const getTotalClicks        = ()     => request("/api/v4/analytics/total",         {}, true);
export const getMyTotalClicks      = ()     => request("/api/v4/analytics/total/me",      {}, true);
export const getDailyClicksByUser  = ()     => request("/api/v4/analytics/daily",         {}, true);
export const getDeviceBreakdown    = ()     => request("/api/v4/analytics/devices",       {}, true);
export const getCountryBreakdown   = ()     => request("/api/v4/analytics/countries",     {}, true);

// ── QR Codes ─────────────────────────────────────────────────────────────────

export const createQR   = (url, label) =>
  request("/api/v4/qr", { method: "POST", body: JSON.stringify({ url, label: label || "" }) }, true);

export const getMyQRs   = () => request("/api/v4/qr", {}, true);

export const getQRBase64 = (id) => request(`/api/v4/qr/${id}/base64`, {}, true);

export const deleteQR   = (id) => request(`/api/v4/qr/${id}`, { method: "DELETE" }, true);

export const getQRImageURL = (id) => `${BASE}/api/v4/qr/${id}/image`;

// Authenticated PNG download — /qr/:id/image is a protected route, so a plain
// <a href> click can't attach the bearer token. Fetch as a blob instead and
// trigger the download from an object URL.
export async function downloadQRImage(id, filename) {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(getQRImageURL(id), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `qr-${id}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── QR Analytics ─────────────────────────────────────────────────────────────

export const getQRDailyScans    = ()   => request("/api/v4/qr/analytics/daily",     {}, true);
export const getQRDailyScansByID = (id) => request(`/api/v4/qr/analytics/daily/${id}`, {}, true);
export const getQRDeviceBreakdown = ()  => request("/api/v4/qr/analytics/devices",  {}, true);
export const getQRTotalScans    = ()   => request("/api/v4/qr/analytics/total",     {}, true);

// ── Admin ─────────────────────────────────────────────────────────────────────

export const getCacheStats = () => request("/api/v4/admin/cache/stats", {}, true);