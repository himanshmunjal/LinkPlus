// Logo.jsx — the LinkPulse brand mark. Used in the sidebar and on the
// Login / Signup screens so the identity is consistent everywhere.

import { Zap } from "lucide-react";

export default function Logo({ collapsed = false, size = "md" }) {
  const boxSize = size === "lg" ? "w-11 h-11" : "w-9 h-9";
  const iconSize = size === "lg" ? "w-6 h-6" : "w-5 h-5";

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span
        className={`flex items-center justify-center ${boxSize} rounded-xl
                    bg-zinc-900 dark:bg-white shrink-0`}
      >
        <Zap className={`${iconSize} text-white dark:text-black`} fill="currentColor" strokeWidth={1.5} />
      </span>
      {!collapsed && (
        <div className="leading-tight min-w-0">
          <p className="font-bold text-zinc-900 dark:text-white text-[15px] tracking-tight truncate">
            LinkPlus
          </p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
            Smart URL Analytics
          </p>
        </div>
      )}
    </div>
  );
}
