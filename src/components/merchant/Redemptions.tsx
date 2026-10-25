"use client";

/**
 * Redemptions (#/merchant/redemptions) — the approval queue. APPROVE is
 * atomic server-side (balance re-checked + decremented in one transaction);
 * REJECT just closes the request. Nothing leaves a balance until approval.
 */

import { useMemo, useState } from "react";
import { Check, Gift, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Reveal, Spinner } from "@/components/customer/shared";
import {
  MerchantHeader,
  EmptyBlock,
  ErrorBlock,
  MerchantCard,
  Micro,
  RowsSkeleton,
  formatWhen,
  useApiData,
  type BusinessT,
  type RedemptionRowT,
} from "./shared";

export function RedemptionsScreen({
  business,
  onPendingCount,
}: {
  business?: BusinessT;
  onPendingCount?: (n: number) => void;
}) {
  const queue = useApiData<{ redemptions: RedemptionRowT[] }>("/api/merchant/redemptions", 15_000);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [tab, setTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");

  const rows = useMemo(() => {
    const all = queue.data?.redemptions ?? [];
    onPendingCount?.(all.filter((r) => r.status === "PENDING").length);
    return all.filter((r) => r.status === tab);
  }, [queue.data, tab, onPendingCount]);

  const decide = async (r: RedemptionRowT, decision: "APPROVED" | "REJECTED") => {
    setBusyId(r.id);
    setBanner(null);
    try {
      await api(`/api/merchant/redemptions/${r.id}/decide`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      await queue.reload();
      setBanner({
        kind: "ok",
        text:
          decision === "APPROVED"
            ? "Approved — the balance is updated and the customer has been notified."
            : "Rejected — the request is closed, nothing was deducted.",
      });
    } catch (e) {
      setBanner({ kind: "err", text: e instanceof ApiError ? e.message : "Couldn't record the decision." });
      await queue.reload();
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = (queue.data?.redemptions ?? []).filter((r) => r.status === "PENDING").length;

  return (
    <div>
      <MerchantHeader
        eyebrow="Approvals"
        title="Redemptions"
        actions={
          pendingCount > 0 ? (
            <span className="inline-flex h-8 items-center rounded-full bg-marigold-soft px-3 font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-sienna tabular-nums">
              {pendingCount} waiting
            </span>
          ) : undefined
        }
      />

      {banner && (
        <Reveal>
          <p
            role="status"
            className={`mb-4 rounded-xl border px-4 py-2.5 text-sm font-medium ${
              banner.kind === "ok"
                ? "border-forest/15 bg-lime-soft text-forest"
                : "border-destructive/25 bg-destructive/5 text-destructive"
            }`}
          >
            {banner.text}
          </p>
        </Reveal>
      )}

      {/* Tabs */}
      <div className="mb-4 inline-flex rounded-full bg-secondary p-1" role="tablist" aria-label="Redemption status">
        {(["PENDING", "APPROVED", "REJECTED"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`press h-9 rounded-full px-4 text-sm font-semibold transition-colors ${
              tab === t ? "bg-forest text-primary-foreground shadow-soft" : "text-body hover:text-ink"
            }`}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {queue.loading ? (
        <RowsSkeleton rows={4} />
      ) : queue.error ? (
        <ErrorBlock message={queue.error.message} onRetry={queue.reload} />
      ) : rows.length === 0 ? (
        <EmptyBlock
          icon={Gift}
          title={tab === "PENDING" ? "Queue is clear" : `No ${tab.toLowerCase()} redemptions`}
          line={
            tab === "PENDING"
              ? "When a customer asks to redeem a reward, it appears here. Approving moves the points — nothing leaves a balance before that."
              : "Decisions you've recorded will show up here."
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => (
            <Reveal key={r.id} delay={Math.min(i, 6) * 0.04}>
              <MerchantCard>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-marigold-soft">
                    <Gift className="h-5 w-5 text-sienna" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-ink">{r.reward.title}</p>
                    <Micro className="mt-0.5">
                      {r.customer.name ?? r.customer.phone ?? "Customer"} · asked {formatWhen(r.createdAt)}
                      {r.decidedAt ? ` · decided ${formatWhen(r.decidedAt)}` : ""}
                    </Micro>
                  </div>
                  <span className="rounded-full bg-lime-soft px-3 py-1 text-sm font-bold text-forest tabular-nums">
                    −{r.cost} {r.unit === "POINTS" ? "pts" : "stamps"}
                  </span>

                  {r.status === "PENDING" ? (
                    <div className="flex w-full gap-2 sm:w-auto">
                      <Button
                        onClick={() => void decide(r, "APPROVED")}
                        disabled={busyId === r.id}
                        className="press h-10 flex-1 rounded-full bg-forest px-4 text-sm font-semibold text-primary-foreground hover:bg-forest/90 sm:flex-none"
                      >
                        {busyId === r.id ? <Spinner /> : <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />}
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        disabled={busyId === r.id}
                        onClick={() => void decide(r, "REJECTED")}
                        className="press h-10 flex-1 rounded-full px-4 text-sm font-semibold sm:flex-none"
                      >
                        <X className="h-4 w-4" strokeWidth={2.5} aria-hidden /> Reject
                      </Button>
                    </div>
                  ) : (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        r.status === "APPROVED" ? "bg-lime-soft text-forest" : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                    </span>
                  )}
                </div>
              </MerchantCard>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
