"use client";

/**
 * Transactions (#/merchant/transactions) — real amount-QR activity from
 * /api/merchant/txns. Status chips use neutral containers (refero rule);
 * money values tabular; customer identity only what the API returns.
 */

import { useMemo, useState } from "react";
import { ReceiptText } from "lucide-react";
import { Reveal } from "@/components/customer/shared";
import {
  MerchantHeader,
  EmptyBlock,
  ErrorBlock,
  MerchantCard,
  Micro,
  RowsSkeleton,
  TxnStatusChip,
  formatINR,
  formatWhen,
  useApiData,
  type BusinessT,
  type TxnRowT,
} from "./shared";

const FILTERS = ["ALL", "CONSUMED", "PENDING", "EXPIRED"] as const;

export function TransactionsScreen({ business }: { business?: BusinessT }) {
  const txns = useApiData<{ txns: TxnRowT[] }>("/api/merchant/txns?limit=100");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");

  const rows = useMemo(() => {
    const all = txns.data?.txns ?? [];
    return filter === "ALL" ? all : all.filter((t) => t.status === filter);
  }, [txns.data, filter]);

  const consumedTotalPaise = useMemo(
    () => (txns.data?.txns ?? []).filter((t) => t.status === "CONSUMED").reduce((s, t) => s + t.amountPaise, 0),
    [txns.data],
  );

  return (
    <div>
      <MerchantHeader eyebrow="Activity" title="Transactions" />

      {/* Summary strip */}
      <Reveal>
        <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-forest/8 bg-card px-5 py-3.5 shadow-card">
          <div>
            <Micro>Scanned QRs</Micro>
            <p className="font-display text-lg font-extrabold text-ink tabular-nums">
              {txns.data?.txns.length ?? 0}
            </p>
          </div>
          <div className="h-8 w-px bg-forest/8" aria-hidden />
          <div>
            <Micro>Confirmed spend</Micro>
            <p className="font-display text-lg font-extrabold text-forest tabular-nums">
              {formatINR(consumedTotalPaise)}
            </p>
          </div>
        </div>
      </Reveal>

      {/* Filter chips */}
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter transactions">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`press h-10 rounded-full px-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors ${
              filter === f ? "bg-forest text-primary-foreground" : "border border-forest/10 bg-card text-body hover:border-input"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {txns.loading ? (
        <RowsSkeleton rows={5} />
      ) : txns.error ? (
        <ErrorBlock message={txns.error.message} onRetry={txns.reload} />
      ) : rows.length === 0 ? (
        <EmptyBlock
          icon={ReceiptText}
          title={filter === "ALL" ? "No transactions yet" : `No ${filter.toLowerCase()} transactions`}
          line="Amount QRs you create at the counter appear here the moment customers scan them."
        />
      ) : (
        <MerchantCard padded={false} className="divide-y divide-forest/6">
          {rows.map((t, i) => (
            <Reveal key={t.id} delay={Math.min(i, 6) * 0.03}>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-soft">
                  <ReceiptText className="h-4.5 w-4.5 text-forest" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink tabular-nums">{formatINR(t.amountPaise)}</p>
                  <Micro className="mt-0.5 truncate">
                    {t.outlet?.name ?? "Outlet"} · {formatWhen(t.consumedAt ?? t.createdAt)}
                    {t.note ? ` · ${t.note}` : ""}
                  </Micro>
                </div>
                <div className="text-right">
                  <TxnStatusChip status={t.status} />
                  {t.consumedBy && (
                    <Micro className="mt-1">
                      {t.consumedBy.name ?? t.consumedBy.phone ?? "customer"}
                    </Micro>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </MerchantCard>
      )}
    </div>
  );
}
