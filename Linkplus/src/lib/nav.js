// nav.js — single source of truth for sidebar navigation.
// getNavItems(isAdmin) filters out admin-only entries for regular users.

import { LayoutDashboard, Link2, BarChart3, Database, Network, QrCode } from "lucide-react";

const ALL_NAV_ITEMS = [
  { key: "dashboard",    label: "Dashboard",    icon: LayoutDashboard, adminOnly: false },
  { key: "urls",         label: "URLs",         icon: Link2,           adminOnly: false },
  { key: "qrcodes",     label: "QR Codes",      icon: QrCode,          adminOnly: false },
  { key: "analytics",   label: "Analytics",    icon: BarChart3,       adminOnly: false },
  { key: "cache",        label: "Cache Metrics", icon: Database,       adminOnly: true  },
  { key: "architecture", label: "Architecture", icon: Network,         adminOnly: false },
];

export const getNavItems = (isAdmin = false) =>
  ALL_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

// Kept for any legacy imports
export const NAV_ITEMS = ALL_NAV_ITEMS;
