"use client";

/**
 * Home (#/app) — greeting, wallet overview, participating businesses,
 * recent activity. Every section has an honest empty state.
 * Skin: docs/DESIGN.md §8 — balance card = Wise Dark Section Card.
 */

import type { ApiState } from "@/components/customer/shared";
import {
  BusinessCard,
  EmptyState,
  ErrorState,
  ListSkeleton,
  LogoAvatar,
  Reveal,
  StampSlots,
  categoryLabel,
  formatWhen,
  useApiData,
  type BusinessListItem,
  type NotificationT,
  type WalletListItem,
} from "@/components/customer/shared";
import { navigate } from "@/lib/hash-router";
import { useSession } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ArrowRight, Bell, Gift, ReceiptText, ScanLine, Sparkles, Stamp } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Time-of-day greeting, recomputed while the tab is visible so it never
 * gets stuck on a stale part of the day (e.g. "Good morning" at night).
 */
function useGreeting(): string {
  const compute = () => {
    const h = new Date().getHours();
    if (h < 5) return "Up late";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };
  const [text, setText] = useState(compute);
  useEffect(() => {
    const update = () => {
      if (document.visibilityState === "visible") setText(compute());
    };
    const id = setInterval(update, 30_000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return text;
}

function firstName(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  return n ? n.split(/\s+/)[0] : "Friend";
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-[17px] font-bold tracking-[-0.01em] text-ink">{children}</h2>
  );
}

function NotificationRow({ n }: { n: NotificationT }) {
  const isReward = n.type === "REWARD_EARNED";
  const isRedemption = n.type === "REDEMPTION_UPDATE";
  const Icon = isReward ? Gift : isRedemption ? ReceiptText : Bell;
  return (
    <div className="flex items-start gap-3 rounded-[18px] border border-forest/8 bg-card p-3.5 shadow-soft">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          isReward ? "bg-marigold-soft" : isRedemption ? "bg-lime-soft" : "bg-muted"
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4",
            isReward ? "text-sienna" : isRedemption ? "text-forest" : "text-muted-foreground"
          )}
          strokeWidth={1.75}
          aria-hidden
        />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug text-ink">{n.title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-body">{n.body}</p>
        <p className="mt-1 font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase">
          {formatWhen(n.createdAt)}
        </p>
      </div>
      {!n.readAt && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-marigold">
          <span className="sr-only">New</span>
        </span>
      )}
    </div>
  );
}

export function HomeTab({
  notifications,
}: {
  notifications: ApiState<{ notifications: NotificationT[]; unread: number }>;
}) {
  const { user } = useSession();
  const greetingText = useGreeting();
  const wallet = useApiData<{ accounts: WalletListItem[] }>(user ? "/api/wallet" : null);
  const businesses = useApiData<{ businesses: BusinessListItem[] }>("/api/businesses");

  // Refresh the activity feed whenever Home becomes the visible tab.
  useEffect(() => {
    notifications.reload();
  }, []);

  const accounts = wallet.data?.accounts ?? [];
  const totalPoints = accounts.reduce((s, a) => s + a.points, 0);
  const totalStamps = accounts.reduce((s, a) => s + a.stamps, 0);
  const offersCount = accounts.reduce((s, a) => s + a.activeRewards.length, 0);
  const recent = (notifications.data?.notifications ?? []).slice(0, 5);

  return (
    <div className="space-y-8 px-4 pb-8 pt-6">
      {/* Greeting */}
      <Reveal>
        <div>
          <p className="font-mono text-[11px] font-medium tracking-[0.14em] text-sienna uppercase">
            {greetingText},
          </p>
          <h1 className="font-display mt-1 text-[1.75rem] leading-tight font-extrabold tracking-[-0.02em] text-ink">
            {firstName(user?.name)}
          </h1>
        </div>
      </Reveal>

      {/* Overview — the Dark Section Card (DESIGN.md §8) */}
      <Reveal delay={0.06}>
        <div className="relative overflow-hidden rounded-[24px] bg-forest p-5 shadow-card">
          {/* off-axis lime glow + grain */}
          <div aria-hidden className="absolute -top-16 -right-12 h-44 w-44 rounded-full bg-lime/25 blur-3xl" />
          <div aria-hidden className="dot-grid-dark absolute inset-0 opacity-70" />
          <div className="relative">
            {wallet.loading ? (
              <div className="space-y-3" aria-busy="true">
                <Skeleton className="h-4 w-40 bg-white/20" />
                <Skeleton className="h-9 w-24 bg-white/20" />
              </div>
            ) : wallet.error ? (
              <ErrorState message={wallet.error.message} onRetry={wallet.reload} />
            ) : accounts.length === 0 ? (
              <div className="space-y-2">
                <p className="font-mono text-[11px] font-medium tracking-[0.14em] text-white/50 uppercase">
                  Your wallet
                </p>
                <p className="font-display text-xl font-extrabold text-[#FAF7F2]">
                  Ready when you are
                </p>
                <p className="text-sm leading-6 text-white/70">
                  Scan a shop's Reward Jar QR code to start collecting stamps and points.
                </p>
                <Button
                  onClick={() => navigate("#/app/scan")}
                  className="press mt-3 h-11 rounded-full bg-lime px-5 font-semibold text-forest hover:bg-lime/90"
                >
                  <ScanLine className="h-4 w-4" aria-hidden />
                  Scan a shop's code
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <p className="font-mono text-[11px] font-medium tracking-[0.14em] text-white/50 uppercase">
                    Collecting at{" "}
                    <span className="text-lime tabular-nums">{accounts.length}</span>{" "}
                    {accounts.length === 1 ? "business" : "businesses"}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("#/app/history")}
                    className="press inline-flex min-h-10 items-center justify-center rounded-full border border-white/15 bg-white/5 px-3.5 py-2 font-mono text-[11px] font-medium tracking-[0.1em] text-white/75 uppercase transition-colors hover:bg-white/10"
                  >
                    Activity
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-white/8 px-3 py-3.5 ring-1 ring-white/10">
                    <p className="font-display text-[1.35rem] leading-none font-extrabold text-lime tabular-nums">
                      {totalPoints}
                    </p>
                    <p className="mt-1.5 font-mono text-[11px] tracking-[0.12em] text-white/55 uppercase">
                      Points
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/8 px-3 py-3.5 ring-1 ring-white/10">
                    <p className="font-display text-[1.35rem] leading-none font-extrabold text-lime tabular-nums">
                      {totalStamps}
                    </p>
                    <p className="mt-1.5 font-mono text-[11px] tracking-[0.12em] text-white/55 uppercase">
                      Stamps
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/8 px-3 py-3.5 ring-1 ring-white/10">
                    <p className="font-display text-[1.35rem] leading-none font-extrabold text-marigold tabular-nums">
                      {offersCount}
                    </p>
                    <p className="mt-1.5 font-mono text-[11px] tracking-[0.12em] text-white/55 uppercase">
                      Offers ready
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Reveal>

      {/* Participating businesses (no fake geolocation — honest label) */}
      <Reveal delay={0.12}>
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionTitle>Participating businesses</SectionTitle>
            <button
              type="button"
              onClick={() => navigate("#/app/discover")}
              className="press inline-flex items-center gap-1 text-sm font-semibold text-forest underline-offset-4 hover:underline"
            >
              See all <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
          {businesses.loading ? (
            <div className="flex gap-3 overflow-hidden" aria-busy="true">
              {[0, 1].map((i) => (
                <div key={i} className="w-44 shrink-0 space-y-2 rounded-[18px] border border-border bg-card p-4">
                  <Skeleton className="h-12 w-12 rounded-2xl" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : businesses.error ? (
            <ErrorState message={businesses.error.message} onRetry={businesses.reload} />
          ) : (businesses.data?.businesses ?? []).length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No businesses yet"
              line="Shops join Reward Jar one by one. Check Discover soon — or tell your favourite local shop about us."
            />
          ) : (
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 scroll-slim" role="list">
              {(businesses.data?.businesses ?? []).slice(0, 6).map((b) => (
                <div key={b.id} role="listitem">
                  <BusinessCard
                    business={b}
                    compact
                    onClick={() => navigate(`#/app/business/${b.id}`)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </Reveal>

      {/* Recent activity */}
      <Reveal delay={0.18}>
        <section className="space-y-3">
          <SectionTitle>Recent activity</SectionTitle>
          {notifications.loading ? (
            <ListSkeleton rows={2} />
          ) : notifications.error ? (
            <ErrorState message={notifications.error.message} onRetry={notifications.reload} />
          ) : recent.length === 0 ? (
            <EmptyState
              icon={Stamp}
              title="No visits yet"
              line="Scan a shop's QR code to start earning — your stamps and points will show up here."
              action={
                <Button
                  onClick={() => navigate("#/app/scan")}
                  className="press h-11 rounded-full bg-forest px-5 font-semibold text-primary-foreground"
                >
                  <ScanLine className="h-4 w-4" aria-hidden />
                  Scan a shop's code
                </Button>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {recent.map((n) => (
                <NotificationRow key={n.id} n={n} />
              ))}
            </div>
          )}
        </section>
      </Reveal>

      {/* Stamp cards — the perforated signature object */}
      {!wallet.loading && accounts.length > 0 && (
        <Reveal delay={0.24}>
          <section className="space-y-3">
            <SectionTitle>Your stamp cards</SectionTitle>
            <div className="space-y-3">
              {accounts.slice(0, 4).map((a) => (
                <button
                  key={a.business.id}
                  type="button"
                  onClick={() => navigate(`#/app/business/${a.business.id}`)}
                  className="press perf-x block w-full bg-white text-left shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
                >
                  <div className="flex items-center gap-3 border-b border-dashed border-forest/15 px-4 py-3">
                    <LogoAvatar name={a.business.name} logoUrl={a.business.logoUrl} className="h-10 w-10 text-base" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-bold text-ink">{a.business.name}</p>
                      <p className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                        {categoryLabel(a.business.category)}
                        {a.activeRewards.length > 0
                          ? ` · ${a.activeRewards.length} reward${a.activeRewards.length === 1 ? "" : "s"} ready`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-base font-extrabold text-ink tabular-nums">{a.points}</p>
                      <p className="font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase">pts</p>
                    </div>
                  </div>
                  {(() => {
                    const stampProgram = a.programs.find((p) => p.type === "STAMPS");
                    const toReward =
                      stampProgram && typeof stampProgram.config?.stampsToReward === "number"
                        ? stampProgram.config.stampsToReward
                        : null;
                    if (toReward) {
                      return (
                        <div className="px-4 py-3">
                          <StampSlots value={Math.min(a.stamps, toReward)} total={toReward} size={24} />
                          <p className="mt-2 text-[11px] font-medium text-body">
                            {a.stamps >= toReward
                              ? "Reward ready — open the card to redeem"
                              : `${toReward - a.stamps} more visit${toReward - a.stamps === 1 ? "" : "s"} for a reward`}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </button>
              ))}
            </div>
          </section>
        </Reveal>
      )}
    </div>
  );
}
