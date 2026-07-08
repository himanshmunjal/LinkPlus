// expiry.js — shared helpers for formatting and checking QR code expiry.

/**
 * Returns a short, human-readable countdown string like "5h 42m left",
 * "12m left", "Expired", or null if no expiry is set.
 */
export function formatTimeLeft(expiresAt) {
    if (!expiresAt) return null;
  
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return "Expired";
  
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
  
    if (hours === 0) return `${minutes}m left`;
    return `${hours}h ${minutes}m left`;
  }
  
  /** True once the expiry timestamp has passed. */
  export function isExpired(expiresAt) {
    if (!expiresAt) return false;
    return new Date(expiresAt).getTime() <= Date.now();
  }
  
  /** True when less than 30 minutes remain — used to trigger a warning style. */
  export function isExpiringSoon(expiresAt) {
    if (!expiresAt) return false;
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    return diffMs > 0 && diffMs <= 30 * 60 * 1000;
  }