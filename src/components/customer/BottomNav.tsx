"use client";

/**
 * Customer app navigation — bottom bar on mobile, top pill tabs on ≥md.
 * Targets ≥44px; active state = forest icon/label + lime dot (static cue).
 */

import { Compass, History, Home, ScanLine, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { navigate } from "@/lib/hash-router";
import { cn } from "@/lib/utils";

export type CustomerTabKey = "home" | "discover" | "scan" | "history" | "profile";

export const CUSTOMER_TABS: {
  key: CustomerTabKey;
  href: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { key: "home", href: "#/app", label: "Home", icon: Home },
  { key: "discover", href: "#/app/discover", label: "Discover", icon: Compass },
  { key: "scan", href: "#/app/scan", label: "Scan", icon: ScanLine },
  { key: "history", href: "#/app/history", label: "History", icon: History },
  { key: "profile", href: "#/app/profile", label: "Profile", icon: User },
];

function useActiveTab(subRoute: string[]): CustomerTabKey {
  const head = subRoute[0] ?? "home";
  if (head === "discover" || head === "business") return "discover";
  if (head === "scan") return "scan";
  if (head === "history") return "history";
  if (head === "profile") return "profile";
  return "home";
}

export function BottomNav({
  subRoute,
  unread,
}: {
  subRoute: string[];
  unread?: number;
}) {
  const active = useActiveTab(subRoute);
  return (
    <nav
      aria-label="Customer app"
      className="shrink-0 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch">
        {CUSTOMER_TABS.map((t) => {
          const isActive = t.key === active;
          const Icon = t.icon;
          return (
            <li key={t.key} className="flex-1">
              <button
                type="button"
                onClick={() => navigate(t.href)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "press relative flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
                  isActive ? "text-forest" : "text-muted-foreground"
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden />
                  {t.key === "history" && unread && unread > 0 ? (
                    <span
                      className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-marigold"
                      aria-hidden
                    />
                  ) : null}
                </span>
                {t.label}
                {isActive ? (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-lime" aria-hidden />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function TopTabs({ subRoute }: { subRoute: string[] }) {
  const active = useActiveTab(subRoute);
  return (
    <nav
      aria-label="Customer app"
      // Audit (responsive): compact paddings so all five tabs fit inside the
      // desktop app shell without horizontal scroll/clipping.
      className="hidden shrink-0 items-center gap-1 overflow-x-auto px-3 py-3 md:flex md:justify-center scroll-slim"
    >
      {CUSTOMER_TABS.map((t) => {
        const isActive = t.key === active;
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => navigate(t.href)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "press flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
              isActive
                ? "bg-forest text-primary-foreground shadow-sm"
                : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
