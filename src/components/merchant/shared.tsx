"use client";

/**
 * Merchant app shared primitives — docs/DESIGN.md §8 (Ramp spec):
 * white cards + warm hairlines replace shadows as the elevation primitive,
 * hierarchy via size + tracking, 10px uppercase mono micro-labels,
 * LIME accent only on money-moving elements.
 */

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types (mirror the API exactly) ──────────────────────────────────────────

export type OutletT = {
  id: string;
  name: string;
  addressLine: string | null;
  isPrimary: boolean;
  code?: string;
};

export type RewardRowT = {
  id: string;
  title: string;
  description: string | null;
  cost: number;
  unit: string;
  active: boolean;
  terms?: string | null;
};

export type ProgramRowT = {
  id: string;
  name: string;
  type: string;
  status: string;
  config: Record<string, unknown>;
  terms: string | null;
  startsAt: string | null;
  endsAt: string | null;
  rewards: RewardRowT[];
};

export type BusinessT = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  logoUrl: string | null;
  isDemo: boolean;
  feedbackEnabled: boolean;
  outlets: OutletT[];
  programs: ProgramRowT[];
};

export type MerchantBusinessRes = { business: BusinessT | null; businesses: BusinessT[] };

export type RedemptionRowT = {
  id: string;
  status: string;
  cost: number;
  unit: string;
  createdAt: string;
  decidedAt: string | null;
  reward: { id: string; title: string; cost: number; unit: string };
  business: { id: string; name: string };
  customer: { id: string; name: string | null; phone: string | null };
};

export type TxnRowT = {
  id: string;
  amountPaise: number;
  note: string | null;
  status: string;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
  outlet: { id: string; name: string } | null;
  consumedBy: { id: string; name: string | null; phone: string | null } | null;
};

export type AnalyticsT = {
  totalCustomers: number;
  activeCustomers30: number;
  visits7: number;
  visits30: number;
  pointsIssued30: number;
  redemptions30: number;
  approvedRedemptions30: number;
  repeatCustomers: number;
  repeatRate: number;
  recentTxns: {
    id: string;
    amountPaise: number;
    status: string;
    createdAt: string;
    consumedAt: string | null;
    outlet: { id: string; name: string } | null;
    consumedBy: { name: string | null; phone: string | null } | null;
  }[];
};


/**
 * Program config arrives as a JSON string from GET /api/merchant/business but
 * as a parsed object from GET /api/merchant/program — normalize both.
 */
export function parseProgramConfig(config: unknown): Record<string, unknown> {
  if (typeof config === "string") {
    try {
      const parsed: unknown = JSON.parse(config);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return config && typeof config === "object" && !Array.isArray(config)
    ? (config as Record<string, unknown>)
    : {};
}

// ─── Money & time ────────────────────────────────────────────────────────────

export function formatINR(paise: number): string {
  return "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Micro label (Ramp: 10px uppercase mono, +0.05em) ───────────────────────

export function Micro({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground", className)}>
      {children}
    </p>
  );
}

export function MicroOnDark({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-white/50", className)}>
      {children}
    </p>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────

export function MerchantCard({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border border-forest/8 bg-card shadow-card", padded && "p-5", className)}>
      {children}
    </div>
  );
}

// ─── Status chips (neutral containers, accents as dots — refero rule) ────────

export function ProgramStatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "bg-lime-soft text-forest",
    DRAFT: "bg-secondary text-body",
    PAUSED: "bg-marigold-soft text-sienna",
  };
  const dot: Record<string, string> = {
    ACTIVE: "bg-forest",
    DRAFT: "bg-muted-foreground/50",
    PAUSED: "bg-marigold",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", map[status] ?? "bg-secondary text-body")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot[status] ?? "bg-muted-foreground")} aria-hidden />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function TxnStatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-secondary text-body",
    CONSUMED: "bg-lime-soft text-forest",
    EXPIRED: "bg-marigold-soft text-sienna",
  };
  const dot: Record<string, string> = {
    PENDING: "bg-muted-foreground/50",
    CONSUMED: "bg-forest",
    EXPIRED: "bg-marigold",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", map[status] ?? "bg-secondary text-body")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot[status] ?? "bg-muted-foreground")} aria-hidden />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ─── KPI tile (dark forest strip; lime only on money-movers) ─────────────────

export function KpiTile({
  label,
  value,
  money = false,
}: {
  label: string;
  value: string | number;
  money?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-white/50">{label}</p>
      <p
        className={cn(
          "font-display mt-1.5 truncate text-xl font-extrabold tabular-nums sm:text-2xl",
          money ? "text-lime" : "text-[#FAF7F2]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Data hook (same contract as customer shared.useApiData) ─────────────────

export type ApiState<T> = {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
};

export function useApiData<T>(path: string | null): ApiState<T> {
  const [state, setState] = useState<{ data: T | null; error: ApiError | null; key: string }>({
    data: null,
    error: null,
    key: "",
  });
  const [tick, setTick] = useState(0);
  const key = `${path ?? ""}#${tick}`;

  useEffect(() => {
    if (!path) return;
    let active = true;
    const ac = new AbortController();
    api<T>(path, { signal: ac.signal })
      .then((d) => {
        if (active) setState({ data: d, error: null, key });
      })
      .catch((e: unknown) => {
        if (active)
          setState({
            data: null,
            error:
              e instanceof ApiError
                ? e
                : new ApiError(0, "Couldn't reach Perk Loop. Check your connection and try again."),
            key,
          });
      });
    return () => {
      active = false;
      ac.abort();
    };
  }, [path, key]);

  const loading = path !== null && state.key !== key;
  return {
    data: !loading ? state.data : null,
    error: !loading ? state.error : null,
    loading,
    reload: useCallback(() => setTick((t) => t + 1), []),
  };
}

// ─── Empty & error states (honest, in-system) ────────────────────────────────

export function EmptyBlock({
  icon: Icon,
  title,
  line,
  action,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  line: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-forest/15 bg-secondary/50 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card shadow-soft">
        <Icon className="h-5 w-5 text-forest" strokeWidth={1.5} aria-hidden />
      </div>
      <p className="font-display text-base font-bold text-ink">{title}</p>
      <p className="max-w-[42ch] text-sm leading-6 text-body">{line}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-destructive/25 bg-destructive/5 px-6 py-8 text-center">
      <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
      <p className="font-display text-base font-bold text-ink">Something went wrong</p>
      <p className="max-w-[44ch] text-sm text-body">{message}</p>
      {onRetry && (
        <Button variant="outline" className="press mt-2 h-10 rounded-full" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden /> Try again
        </Button>
      )}
    </div>
  );
}

export function RowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-forest/8 bg-card p-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

// ─── Form field wrappers (h-11 inputs, 3:1 borders, mono labels) ─────────────

export function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </label>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-2 text-[13px] font-medium text-destructive">
      {message}
    </p>
  );
}

/* ─────────────────────────── Page header ──────────────────────────── */

export function MerchantHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow: string;
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <Micro>{eyebrow}</Micro>
        <h1 className="font-display mt-1 text-[1.45rem] font-extrabold tracking-[-0.02em] text-ink sm:text-[1.7rem]">
          {title}
        </h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
