"use client";

/**
 * Analytics (#/merchant/analytics) — REAL aggregates only from
 * /api/merchant/analytics. Empty data shows composed empty states; no fake
 * numbers, ever (honest-states policy). Recharts bars: forest, today lime.
 */

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Repeat, Users } from "lucide-react";
import { Reveal } from "@/components/customer/shared";
import {
  MerchantHeader,
  EmptyBlock,
  KpiTile,
  MerchantCard,
  Micro,
  MicroOnDark,
  RowsSkeleton,
  useApiData,
  type AnalyticsT,
  type BusinessT,
} from "./shared";

/** The API gives 7d/30d totals, not a daily series. We show what's real:
 * a per-window comparison + the recent txn tape — no invented series. */
export function AnalyticsScreen({ business }: { business?: BusinessT }) {
  const res = useApiData<{ analytics: AnalyticsT }>("/api/merchant/analytics");
  const a = res.data?.analytics ?? null;

  const windowData = useMemo(() => {
    if (!a) return [];
    return [
      { name: "Last 7 days", visits: a.visits7 },
      { name: "Days 8–30", visits: Math.max(0, a.visits30 - a.visits7) },
    ];
  }, [a]);

  if (res.loading) {
    return (
      <div>
        <MerchantHeader eyebrow="Insights" title="Analytics" />
        <RowsSkeleton rows={3} />
      </div>
    );
  }
  if (res.error) {
    return (
      <div>
        <MerchantHeader eyebrow="Insights" title="Analytics" />
        <EmptyBlock icon={BarChart3} title="Couldn't load analytics" line={res.error.message} />
      </div>
    );
  }
  if (!a) return null;

  const hasAny = a.totalCustomers > 0 || a.visits30 > 0 || a.pointsIssued30 > 0;

  return (
    <div>
      <MerchantHeader eyebrow="Insights" title="Analytics" />

      {!hasAny ? (
        <EmptyBlock
          icon={BarChart3}
          title="Nothing to chart yet"
          line="Your first customer visit will light this up — everything here is real data from your own counter, never estimates."
        />
      ) : (
        <>
          {/* KPI band */}
          <Reveal>
            <div className="relative overflow-hidden rounded-[20px] bg-forest px-5 py-5 shadow-card">
              <div aria-hidden className="absolute -top-14 -right-10 h-40 w-40 rounded-full bg-lime/20 blur-3xl" />
              <div className="relative grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
                <KpiTile label="Total customers" value={a.totalCustomers} />
                <KpiTile label="Active · 30d" value={a.activeCustomers30} />
                <KpiTile label="Points issued · 30d" value={a.pointsIssued30} money />
                <KpiTile label="Redemptions · 30d" value={a.redemptions30} money={a.approvedRedemptions30 > 0} />
              </div>
              <div className="relative mt-5 border-t border-white/10 pt-4">
                <MicroOnDark>
                  {a.repeatCustomers} of {a.totalCustomers} customers came back more than once
                </MicroOnDark>
              </div>
            </div>
          </Reveal>

          {/* Stat cards */}
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Reveal delay={0.05}>
              <MerchantCard className="h-full">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-soft">
                  <Repeat className="h-5 w-5 text-forest" strokeWidth={1.75} aria-hidden />
                </span>
                <p className="font-display mt-3 text-2xl font-extrabold text-ink tabular-nums">
                  {Math.round(a.repeatRate * 100)}%
                </p>
                <Micro className="mt-1">Repeat rate · customers with 2+ visits</Micro>
              </MerchantCard>
            </Reveal>
            <Reveal delay={0.09}>
              <MerchantCard className="h-full">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-soft">
                  <Users className="h-5 w-5 text-forest" strokeWidth={1.75} aria-hidden />
                </span>
                <p className="font-display mt-3 text-2xl font-extrabold text-ink tabular-nums">
                  {a.visits7}
                </p>
                <Micro className="mt-1">Visits this week (all sources)</Micro>
              </MerchantCard>
            </Reveal>
            <Reveal delay={0.13}>
              <MerchantCard className="h-full">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-marigold-soft">
                  <BarChart3 className="h-5 w-5 text-sienna" strokeWidth={1.75} aria-hidden />
                </span>
                <p className="font-display mt-3 text-2xl font-extrabold text-ink tabular-nums">
                  {a.approvedRedemptions30}
                </p>
                <Micro className="mt-1">Rewards approved · 30 days</Micro>
              </MerchantCard>
            </Reveal>
          </div>

          {/* Visits by window — real totals only */}
          <Reveal delay={0.16}>
            <MerchantCard className="mt-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-[15px] font-bold text-ink">Visits by window</h2>
                <Micro>Real counts · no estimates</Micro>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={windowData} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                    <CartesianGrid vertical={false} stroke="rgba(22,51,0,0.08)" strokeDasharray="0" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#5C5F55" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#5C5F55" }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(22,51,0,0.04)" }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid rgba(22,51,0,0.1)",
                        fontSize: 12,
                        boxShadow: "0 6px 20px rgba(22,51,0,0.08)",
                      }}
                    />
                    <Bar dataKey="visits" fill="#163300" radius={[6, 6, 0, 0]} maxBarSize={64} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </MerchantCard>
          </Reveal>

          {/* Recent tape */}
          <Reveal delay={0.2}>
            <MerchantCard className="mt-5">
              <h2 className="mb-3 font-display text-[15px] font-bold text-ink">Latest scanned QRs</h2>
              {a.recentTxns.length === 0 ? (
                <p className="text-sm text-body">
                  No amount QRs scanned yet — create one from the QR studio when a customer is ready to pay.
                </p>
              ) : (
                <ul className="divide-y divide-forest/6">
                  {a.recentTxns.slice(0, 6).map((t) => (
                    <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="font-medium text-ink tabular-nums">
                        ₹{(t.amountPaise / 100).toLocaleString("en-IN")}
                      </span>
                      <Micro>{t.status.toLowerCase()}</Micro>
                    </li>
                  ))}
                </ul>
              )}
            </MerchantCard>
          </Reveal>
        </>
      )}
    </div>
  );
}
