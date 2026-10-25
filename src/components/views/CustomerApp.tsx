"use client";

/**
 * CustomerApp shell (#/app/…) — gates, mobile-first column (max-w-md) with
 * bottom nav on phones and top tabs on ≥md, internal scroll areas.
 */

import { useEffect, useRef, useState } from "react";
import { navigate, useHashRoute } from "@/lib/hash-router";
import { useSession } from "@/lib/store";
import {
  ErrorState,
  Reveal,
  Spinner,
  useApiData,
  type NotificationT,
} from "@/components/customer/shared";
import { BottomNav, TopTabs } from "@/components/customer/BottomNav";
import { MerchantOwnerGate } from "@/components/customer/MerchantOwnerGate";
import { HomeTab } from "@/components/customer/HomeTab";
import { DiscoverTab } from "@/components/customer/DiscoverTab";
import { BusinessDetail } from "@/components/customer/BusinessDetail";
import { ScanTab } from "@/components/customer/ScanTab";
import { HistoryTab } from "@/components/customer/HistoryTab";
import { ProfileTab } from "@/components/customer/ProfileTab";

/** Remember the deep link so auth can bring the user back here. */
function storeReturnPath() {
  try {
    const raw = window.location.hash || "#/app";
    sessionStorage.setItem("pl_return_to", raw);
  } catch {
    /* private mode */
  }
}

function GateScreen({ line }: { line: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <img src="/logo.svg" alt="" className="h-12 w-12" />
      <p className="text-sm text-muted-foreground">{line}</p>
      <Spinner className="text-muted-foreground" />
    </div>
  );
}

export function CustomerApp({ subRoute }: { subRoute: string[] }) {
  const { user, loading, fetchMe, fetched } = useSession();
  const route = useHashRoute();
  const mainRef = useRef<HTMLElement | null>(null);

  // Self-heal: a stale client (e.g. after server restart) refetches once.
  useEffect(() => {
    if (!fetched) void fetchMe();
  }, [fetched, fetchMe]);

  const notifications = useApiData<{ notifications: NotificationT[]; unread: number }>(
    user?.role === "CUSTOMER" ? "/api/notifications" : null,
    15_000 // audit F12: approval/notification updates arrive without a manual reload
  );
  const refreshNotifications = () => notifications.reload();

  // Signed-out gate — store the deep link, then go to auth.
  useEffect(() => {
    if (!loading && !user) {
      storeReturnPath();
      navigate("#/auth?role=customer");
    }
  }, [loading, user]);

  // Back-target memory: business detail returns to the list you came from.
  const raw = "#" + route.raw;
  const lastNavRef = useRef<string>("");
  const [backTo, setBackTo] = useState("#/app");
  const isDetail = subRoute[0] === "business";
  useEffect(() => {
    if (lastNavRef.current === raw) return;
    const prev = lastNavRef.current;
    lastNavRef.current = raw;
    if (isDetail && prev.startsWith("#/app") && !prev.startsWith("#/app/business")) {
      setBackTo(prev);
    } else if (isDetail) {
      setBackTo("#/app");
    }
  }, [raw, isDetail]);

  // Reset scroll when the sub-route changes.
  const subKey = subRoute.join("/");
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [route.raw, subKey]);

  const body = (() => {
    const head = subRoute[0] ?? "";
    if (head === "") return <HomeTab notifications={notifications} />;
    if (head === "discover") return <DiscoverTab />;
    if (head === "business" && subRoute[1]) {
      return <BusinessDetail businessId={subRoute[1]} backTo={backTo} />;
    }
    if (head === "scan") return <ScanTab />;
    if (head === "history") return <HistoryTab notifications={notifications} onSeen={refreshNotifications} />;
    if (head === "profile") return <ProfileTab />;
    return (
      <div className="px-4 py-10">
        <Reveal>
          <ErrorState
            message="That page doesn't exist in the app."
            onRetry={() => navigate("#/app")}
          />
        </Reveal>
      </div>
    );
  })();

  // ── Gates ──
  if (loading) {
    return (
      <div className="flex min-h-dvh justify-center bg-background">
        <div className="flex h-dvh w-full max-w-md flex-col md:max-w-lg border-border md:border-x">
          <GateScreen line="Opening your wallet…" />
        </div>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="flex min-h-dvh justify-center bg-background">
        <div className="flex h-dvh w-full max-w-md flex-col md:max-w-lg border-border md:border-x">
          <GateScreen line="Taking you to sign in…" />
        </div>
      </div>
    );
  }
  if (user.role === "MERCHANT_OWNER") {
    return (
      <div className="flex min-h-dvh justify-center bg-background">
        <div className="flex h-dvh w-full max-w-md flex-col md:max-w-lg border-border md:border-x">
          <MerchantOwnerGate via="app" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh justify-center bg-background">
      <div className="flex h-dvh w-full max-w-md flex-col md:max-w-lg border-border bg-background md:border-x md:shadow-[0_12px_32px_rgba(26,29,22,0.08)]">
        <TopTabs subRoute={subRoute} />
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto overscroll-contain scroll-slim"
          aria-live="polite"
        >
          {body}
        </main>
        <BottomNav subRoute={subRoute} unread={notifications.data?.unread ?? 0} />
      </div>
    </div>
  );
}
