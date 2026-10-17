"use client";

/**
 * Dashboard (#/merchant) — real KPIs from /api/merchant/analytics (zeros are
 * honest), quick actions, pending redemptions preview, recent transactions.
 */

import { Gift, Plus, QrCode, ReceiptText, Ticket } from "lucide-react";
import { navigate } from "@/lib/hash-router";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/customer/shared";
import {
  MerchantHeader,
  EmptyBlock,
  ErrorBlock,
  KpiTile,
  MerchantCard,
  Micro,
  MicroOnDark,
  RowsSkeleton,
  TxnStatusChip,
  formatINR,
  formatWhen,
  useApiData,
  type AnalyticsT,
  type BusinessT,
  type RedemptionRowT,
} from "./shared";

export function DashboardScreen({ business }: { business: BusinessT }) {
  const analytics = useApiData<{ analytics: AnalyticsT }>("/api/merchant/analytics");
  const pending = useApiData<{ redemptions: RedemptionRowT[] }>(
    "/api/merchant/redemptions?status=PENDING",
  );

  const a = analytics.data?.analytics ?? null;
  const pendingRows = pending.data?.redemptions ?? [];

  const activeProgram = business.programs.find((p) => p.status === "ACTIVE") ?? null;
  const hasProgram = business.programs.length > 0;

  return (
    <div>
      <MerchantHeader
        eyebrow={`${business.category.toLowerCase().replace("_", " ")} · ${business.city ?? "your city"}`}
        title="Dashboard"
        actions={
          <Button
            onClick={() => navigate("#/merchant/qr")}
            className="press h-10 rounded-full bg-forest px-4 text-sm font-semibold text-primary-foreground hover:bg-forest/90"
          >
            <QrCode className="h-4 w-4" aria-hidden /> New amount QR
          </Button>
        }
      />

      {/* KPI band — dark forest strip (DESIGN.md §8) */}
      <Reveal>
        <div className="relative overflow-hidden rounded-[20px] bg-forest px-5 py-5 shadow-card">
          <div aria-hidden className="absolute -top-14 -right-10 h-40 w-40 rounded-full bg-lime/20 blur-3xl" />
          <div className="relative grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
            {analytics.loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-2.5 w-16 rounded bg-white/20" />
                  <div className="h-7 w-12 rounded bg-white/20" />
                </div>
              ))
            ) : analytics.error ? (
              <div className="col-span-full">
                <ErrorBlock message={analytics.error.message} onRetry={analytics.reload} />
              </div>
            ) : (
              <>
                <KpiTile label="Customers" value={a?.totalCustomers ?? 0} />
                <KpiTile label="Visits · 7 days" value={a?.visits7 ?? 0} />
                <KpiTile label="Points issued · 30d" value={a?.pointsIssued30 ?? 0} money />
                <KpiTile label="Pending approvals" value={pendingRows.length} />
              </>
            )}
          </div>
          <div className="relative mt-5 flex items-center justify-between border-t border-white/10 pt-4">
            <MicroOnDark>Repeat rate · {(a ? Math.round(a.repeatRate * 100) : 0)}% of customers came back</MicroOnDark>
            <button
              type="button"
              onClick={() => navigate("#/merchant/analytics")}
              className="press hidden font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-lime hover:underline sm:block"
            >
              Full analytics →
            </button>
          </div>
        </div>
      </Reveal>

      {/* Program status strip */}
      <Reveal delay={0.06}>
        <MerchantCard className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-soft">
              <Ticket className="h-5 w-5 text-forest" strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">
                {hasProgram ? activeProgram?.name ?? "Program paused" : "No loyalty program yet"}
              </p>
              <Micro>
                {hasProgram
                  ? activeProgram
                    ? `${activeProgram.status.toLowerCase()} · ${activeProgram.rewards.length} reward${activeProgram.rewards.length === 1 ? "" : "s"}`
                    : "no active program — customers can't earn right now"
                  : "set one up to start collecting"}
              </Micro>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("#/merchant/program")}
            className="press h-10 rounded-full px-4 text-sm font-semibold"
          >
            {hasProgram ? "Manage program" : <><Plus className="h-4 w-4" aria-hidden /> Create program</>}
          </Button>
        </MerchantCard>
      </Reveal>

      {/* Quick actions */}
      <Reveal delay={0.1}>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { icon: QrCode, label: "Static check-in QR", sub: "Print for the counter", to: "#/merchant/qr" },
            { icon: Gift, label: "Redemption queue", sub: pendingCountLabel(pendingRows.length), to: "#/merchant/redemptions" },
            { icon: ReceiptText, label: "Transactions", sub: "Amount QR activity", to: "#/merchant/transactions" },
          ].map((qa) => (
            <button
              key={qa.label}
              type="button"
              onClick={() => navigate(qa.to)}
              className="press group rounded-2xl border border-forest/8 bg-card p-4 text-left shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-soft transition-colors group-hover:bg-lime-soft">
                <qa.icon className="h-5 w-5 text-forest" strokeWidth={1.75} aria-hidden />
              </span>
              <p className="mt-3 text-sm font-bold text-ink">{qa.label}</p>
              <Micro className="mt-0.5">{qa.sub}</Micro>
            </button>
          ))}
        </div>
      </Reveal>

      {/* Pending redemptions preview */}
      <Reveal delay={0.14}>
        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[17px] font-bold tracking-[-0.01em] text-ink">Redemption requests</h2>
            <button
              type="button"
              onClick={() => navigate("#/merchant/redemptions")}
              className="press text-sm font-semibold text-forest underline-offset-4 hover:underline"
            >
              View all
            </button>
          </div>
          {pending.loading ? (
            <RowsSkeleton rows={2} />
          ) : pendingRows.length === 0 ? (
            <EmptyBlock
              icon={Gift}
              title="No requests waiting"
              line="When a customer redeems a reward, it lands here for your approval — nothing leaves a balance until you approve."
            />
          ) : (
            <div className="space-y-2.5">
              {pendingRows.slice(0, 3).map((r) => (
                <MerchantCard key={r.id} className="flex items-center gap-3 py-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-marigold-soft">
                    <Gift className="h-5 w-5 text-sienna" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{r.reward.title}</p>
                    <Micro>
                      {r.customer.name ?? maskedPhone(r.customer.phone)} · {formatWhen(r.createdAt)}
                    </Micro>
                  </div>
                  <span className="rounded-full bg-lime-soft px-2.5 py-1 text-xs font-bold text-forest tabular-nums">
                    −{r.cost} {r.unit === "POINTS" ? "pts" : "stamps"}
                  </span>
                </MerchantCard>
              ))}
            </div>
          )}
        </section>
      </Reveal>

      {/* Recent amount QRs */}
      <Reveal delay={0.18}>
        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[17px] font-bold tracking-[-0.01em] text-ink">Recent transactions</h2>
            <button
              type="button"
              onClick={() => navigate("#/merchant/transactions")}
              className="press text-sm font-semibold text-forest underline-offset-4 hover:underline"
            >
              View all
            </button>
          </div>
          {!a || a.recentTxns.length === 0 ? (
            <EmptyBlock
              icon={ReceiptText}
              title="No transactions yet"
              line="Amount QRs you create at the counter will show up here as customers scan and pay."
            />
          ) : (
            <MerchantCard padded={false} className="divide-y divide-forest/6">
              {a.recentTxns.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-soft">
                    <ReceiptText className="h-4 w-4 text-forest" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-ink tabular-nums">{formatINR(t.amountPaise)}</p>
                    <Micro>
                      {t.outlet?.name ?? "Outlet"} · {formatWhen(t.consumedAt ?? t.createdAt)}
                    </Micro>
                  </div>
                  <TxnStatusChip status={t.status} />
                </div>
              ))}
            </MerchantCard>
          )}
        </section>
      </Reveal>
    </div>
  );
}

function pendingCountLabel(n: number): string {
  return n > 0 ? `${n} waiting for you` : "all clear";
}

function maskedPhone(phone: string | null): string {
  return phone ?? "Customer";
}
