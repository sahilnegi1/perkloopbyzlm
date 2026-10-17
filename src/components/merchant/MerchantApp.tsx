"use client";

/**
 * Merchant dashboard shell (#/merchant/…) — auth gate → onboarding → layout.
 * Design: docs/DESIGN.md §8 — forest sidebar (#10240F) on desktop, top bar +
 * slide-over on mobile; content on cream; hairline cards; lime only on
 * money-moving accents (active nav pill, CTAs).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  ReceiptText,
  Settings,
  Store,
  Ticket,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { navigate } from "@/lib/hash-router";
import { useSession } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { LogoAvatar, Spinner } from "@/components/customer/shared";
import {
  BusinessRegisterForm,
} from "@/components/auth/BusinessRegisterForm";
import {
  ErrorBlock,
  Micro,
  MicroOnDark,
  RowsSkeleton,
  useApiData,
  type MerchantBusinessRes,
} from "./shared";
import { DashboardScreen } from "./Dashboard";
import { ProgramsScreen } from "./Programs";
import { QrStudioScreen } from "./QrStudio";
import { TransactionsScreen } from "./Transactions";
import { RedemptionsScreen } from "./Redemptions";
import { AnalyticsScreen } from "./Analytics";
import { SettingsScreen } from "./Settings";

type NavKey =
  | "dashboard"
  | "program"
  | "qr"
  | "redemptions"
  | "transactions"
  | "analytics"
  | "settings";

const NAV: { key: NavKey; label: string; icon: LucideIcon; segment: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, segment: "" },
  { key: "program", label: "Loyalty program", icon: Ticket, segment: "program" },
  { key: "qr", label: "QR studio", icon: QrCode, segment: "qr" },
  { key: "redemptions", label: "Redemptions", icon: Gift, segment: "redemptions" },
  { key: "transactions", label: "Transactions", icon: ReceiptText, segment: "transactions" },
  { key: "analytics", label: "Analytics", icon: BarChart3, segment: "analytics" },
  { key: "settings", label: "Settings", icon: Settings, segment: "settings" },
];

function segmentToKey(segments: string[]): NavKey {
  const head = segments[0] ?? "";
  const found = NAV.find((n) => n.segment === head);
  return found?.key ?? "dashboard";
}

function keyToHref(key: NavKey): string {
  const found = NAV.find((n) => n.key === key);
  return found?.segment ? `#/merchant/${found.segment}` : "#/merchant";
}

/* ─────────────────────────── Gate screens ─────────────────────────── */

function SignedOutGate() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-forest shadow-card">
        <Store className="h-7 w-7 text-lime" strokeWidth={1.75} aria-hidden />
      </div>
      <div className="max-w-sm space-y-1.5">
        <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-ink">
          Business dashboard
        </h1>
        <p className="text-sm leading-6 text-body">
          Sign in with your business account to run your loyalty program, QR
          codes and redemptions.
        </p>
      </div>
      <Button
        onClick={() => navigate("#/auth?role=merchant")}
        className="press h-12 rounded-full bg-forest px-7 text-base font-semibold text-primary-foreground hover:bg-forest/90"
      >
        Sign in to continue
      </Button>
      <button
        type="button"
        onClick={() => navigate("#/")}
        className="press text-sm font-medium text-forest underline-offset-4 hover:underline"
      >
        Back to home
      </button>
    </div>
  );
}

function WrongRoleGate({ role }: { role: string }) {
  const { logout } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-marigold-soft">
        <Store className="h-7 w-7 text-sienna" strokeWidth={1.75} aria-hidden />
      </div>
      <div className="max-w-sm space-y-1.5">
        <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-ink">
          This space is for business accounts
        </h1>
        <p className="text-sm leading-6 text-body">
          You're signed in as{" "}
          {role === "CUSTOMER" ? "a customer" : role.toLowerCase().replace("_", " ")}.
          The merchant dashboard manages shops, programs and redemptions.
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        <Button
          onClick={() => navigate("#/app")}
          className="press h-12 rounded-full bg-forest px-7 text-base font-semibold"
        >
          Open customer wallet
        </Button>
        <Button
          variant="outline"
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true);
            try {
              await logout();
              navigate("#/auth?role=merchant");
            } finally {
              setSigningOut(false);
            }
          }}
          className="press h-12 rounded-full text-base font-semibold"
        >
          Switch account
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────── Onboarding ───────────────────────────── */

function OnboardingScreen() {
  const { fetchMe } = useSession();
  return (
    <div className="min-h-screen bg-canvas-wash">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest shadow-card">
            <Store className="h-6 w-6 text-lime" strokeWidth={1.75} aria-hidden />
          </div>
          <div>
            <Micro>Welcome to Perk Loop</Micro>
            <p className="font-display text-lg font-extrabold tracking-[-0.02em] text-ink">
              Set up your shop
            </p>
          </div>
        </div>
        <BusinessRegisterForm
          onSuccess={() => {
            void fetchMe();
            window.location.reload();
          }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────── Sidebar / nav ────────────────────────── */

function SideNavContent({
  active,
  businessName,
  isDemo,
  onNavigate,
  name,
}: {
  active: NavKey;
  businessName: string;
  isDemo: boolean;
  onNavigate?: () => void;
  name: string | null;
}) {
  const { logout } = useSession();
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 pb-6 pt-6">
        <img src="/logo.svg" alt="" className="h-9 w-9" />
        <div className="min-w-0">
          <p className="font-display text-[15px] font-bold leading-tight tracking-tight text-[#FAF7F2]">
            Perk Loop
          </p>
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.08em] text-white/45">
            {businessName}
            {isDemo ? " · demo" : ""}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav aria-label="Merchant" className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const isActive = item.key === active;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                navigate(keyToHref(item.key));
                onNavigate?.();
              }}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "press flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-lime/60",
                isActive
                  ? "bg-lime text-forest"
                  : "text-white/65 hover:bg-white/8 hover:text-white",
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" strokeWidth={isActive ? 2.2 : 1.75} aria-hidden />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 font-display text-sm font-bold text-[#FAF7F2]">
            {(name ?? "•").trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[#FAF7F2]">
              {name ?? "Business account"}
            </p>
            <MicroOnDark>Owner</MicroOnDark>
          </div>
          <button
            type="button"
            aria-label="Sign out"
            onClick={() => {
              void logout().then(() => navigate("#/"));
            }}
            className="press flex h-9 w-9 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/60"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Shell ────────────────────────────────── */

export function MerchantApp({ subRoute }: { subRoute: string[] }) {
  const { user, loading, fetchMe, fetched } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!fetched) void fetchMe();
  }, [fetched, fetchMe]);

  // Self-heal: if the store holds a non-merchant user (stale cookie, another
  // tab logged in/out), re-verify once before showing a role gate.
  const recheckRef = useRef(false);
  useEffect(() => {
    if (fetched && user && user.role !== "MERCHANT_OWNER" && user.role !== "STAFF" && !recheckRef.current) {
      recheckRef.current = true;
      void fetchMe();
    }
  }, [fetched, user, fetchMe]);

  const businessRes = useApiData<MerchantBusinessRes>(
    user && (user.role === "MERCHANT_OWNER" || user.role === "STAFF") ? "/api/merchant/business" : null,
  );

  const active = useMemo(() => segmentToKey(subRoute), [subRoute]);
  const business = businessRes.data?.business ?? null;

  /* Loading frame */
  if (loading || (fetched && user && businessRes.loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.svg" alt="" className="h-10 w-10" />
          <Spinner className="text-muted-foreground" />
        </div>
      </div>
    );
  }

  /* Auth gates */
  if (!user) return <SignedOutGate />;
  if (user.role !== "MERCHANT_OWNER" && user.role !== "STAFF") return <WrongRoleGate role={user.role} />;

  if (businessRes.error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <ErrorBlock message={businessRes.error.message} onRetry={businessRes.reload} />
      </div>
    );
  }

  /* Onboarding */
  if (!business) return <OnboardingScreen />;

  const demoBadge = business.isDemo ? (
    <span className="rounded-full bg-marigold-soft px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-sienna">
      Demo
    </span>
  ) : null;

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] bg-[#10240F] lg:block grain-dark">
        <SideNavContent
          active={active}
          businessName={business.name}
          isDemo={business.isDemo}
          name={user.name}
        />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-forest/8 bg-card/90 px-4 backdrop-blur lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <img src="/logo.svg" alt="" className="h-7 w-7" />
          <span className="truncate font-display text-[15px] font-bold text-ink">{business.name}</span>
          {demoBadge}
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
          className="size-10 rounded-full"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </Button>
      </header>

      {/* Mobile slide-over nav */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[280px] border-0 bg-[#10240F] p-0">
          <SheetTitle className="sr-only">Merchant navigation</SheetTitle>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
          <SideNavContent
            active={active}
            businessName={business.name}
            isDemo={business.isDemo}
            onNavigate={() => setMenuOpen(false)}
            name={user.name}
          />
        </SheetContent>
      </Sheet>

      {/* Content */}
      <main className="min-w-0 flex-1 px-4 pb-16 pt-6 sm:px-6 lg:ml-[248px] lg:px-8 lg:pt-8">
        <div className="mx-auto max-w-6xl">
          {active === "dashboard" && <DashboardScreen business={business} />}
          {active === "program" && <ProgramsScreen business={business} />}
          {active === "qr" && <QrStudioScreen business={business} />}
          {active === "redemptions" && <RedemptionsScreen business={business} />}
          {active === "transactions" && <TransactionsScreen business={business} />}
          {active === "analytics" && <AnalyticsScreen business={business} />}
          {active === "settings" && <SettingsScreen business={business} />}
        </div>
      </main>
    </div>
  );
}
