"use client";

/**
 * History (#/app/history) — two tabs: Rewards activity (GET /api/redemptions)
 * and Updates (GET /api/notifications). Status chips: PENDING amber,
 * APPROVED lime, REJECTED muted-red.
 */

import { useEffect } from "react";
import {
  EmptyState,
  ErrorState,
  formatWhen,
  ListSkeleton,
  LogoAvatar,
  Reveal,
  StatusChip,
  useApiData,
  type NotificationT,
  type RedemptionT,
} from "@/components/customer/shared";
import { navigate } from "@/lib/hash-router";
import { post } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Gift, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

function RedemptionRow({ r }: { r: RedemptionT }) {
  return (
    <button
      type="button"
      onClick={() => navigate(`#/app/business/${r.business.id}`)}
      className="press flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
    >
      <LogoAvatar name={r.business.name} logoUrl={r.business.logoUrl} className="h-10 w-10 text-base" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{r.reward.title}</p>
        <p className="truncate text-xs text-muted-foreground">{r.business.name}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/80">
          {formatWhen(r.decidedAt ?? r.createdAt)}
          {r.decidedAt ? "" : " · requested"}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <StatusChip status={r.status} />
        <p className="text-xs font-semibold tabular-nums text-muted-foreground">
          {r.cost} {r.unit === "POINTS" ? "pts" : "stamps"}
        </p>
      </div>
    </button>
  );
}

function UpdatesList({
  state,
}: {
  state: ReturnType<typeof useApiData<{ notifications: NotificationT[]; unread: number }>>;
}) {
  if (state.loading) return <ListSkeleton rows={3} />;
  if (state.error) return <ErrorState message={state.error.message} onRetry={state.reload} />;
  const items = state.data?.notifications ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="You're all caught up"
        line="Updates about your rewards, approvals and visits will land here."
      />
    );
  }
  return (
    <ul className="space-y-2.5">
      {items.map((n) => (
        <li key={n.id}>
          <Reveal>
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3.5">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  n.type === "REWARD_EARNED" ? "bg-marigold-soft" : n.type === "REDEMPTION_UPDATE" ? "bg-lime-soft" : "bg-muted"
                )}
              >
                {n.type === "REWARD_EARNED" ? (
                  <Gift className="h-4 w-4 text-sienna" aria-hidden />
                ) : n.type === "REDEMPTION_UPDATE" ? (
                  <Ticket className="h-4 w-4 text-forest" aria-hidden />
                ) : (
                  <Bell className="h-4 w-4 text-muted-foreground" aria-hidden />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug">{n.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground/80">{formatWhen(n.createdAt)}</p>
              </div>
              {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-marigold" aria-label="New" />}
            </div>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

export function HistoryTab({
  notifications,
  onSeen,
}: {
  notifications: ReturnType<typeof useApiData<{ notifications: NotificationT[]; unread: number }>>;
  /** Called once so the shell can clear its badge / mark read server-side. */
  onSeen?: () => void;
}) {
  const redemptions = useApiData<{ redemptions: RedemptionT[] }>("/api/redemptions");

  // Mark notifications read once the feed has loaded with unread items.
  useEffect(() => {
    const unread = notifications.data?.unread ?? 0;
    if (unread > 0) {
      void post("/api/notifications/read");
      onSeen?.();
    }
  }, [notifications.data, onSeen]);

  const list = redemptions.data?.redemptions ?? [];

  return (
    <div className="space-y-5 px-4 pb-8 pt-5">
      <Reveal>
        <div className="space-y-1.5">
          <h1 className="font-display text-[1.75rem] font-extrabold tracking-[-0.02em] text-ink">History</h1>
          <p className="text-sm text-muted-foreground">
            Every reward request and update from your shops.
          </p>
        </div>
      </Reveal>

      <Tabs defaultValue="rewards">
        <TabsList className="h-11 w-full rounded-full p-1">
          <TabsTrigger
            value="rewards"
            className="h-9 flex-1 rounded-full text-sm font-semibold data-[state=active]:bg-forest data-[state=active]:text-primary-foreground"
          >
            Rewards activity
          </TabsTrigger>
          <TabsTrigger
            value="updates"
            className="h-9 flex-1 rounded-full text-sm font-semibold data-[state=active]:bg-forest data-[state=active]:text-primary-foreground"
          >
            Updates
            {(notifications.data?.unread ?? 0) > 0 ? (
              <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-marigold px-1 text-[11px] font-bold text-forest">
                {notifications.data!.unread}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="mt-4 space-y-3">
          {redemptions.loading ? (
            <ListSkeleton rows={3} />
          ) : redemptions.error ? (
            <ErrorState message={redemptions.error.message} onRetry={redemptions.reload} />
          ) : list.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="No redemptions yet"
              line="When you have enough stamps or points, request a reward from a shop's page — it'll show up here with its status."
              action={
                <button
                  type="button"
                  onClick={() => navigate("#/app/discover")}
                  className="press rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  Find businesses
                </button>
              }
            />
          ) : (
            <ul className="space-y-2.5">
              {list.map((r, i) => (
                <li key={r.id}>
                  <Reveal delay={Math.min(i * 0.06, 0.3)}>
                    <RedemptionRow r={r} />
                  </Reveal>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="updates" className="mt-4">
          <UpdatesList state={notifications} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
