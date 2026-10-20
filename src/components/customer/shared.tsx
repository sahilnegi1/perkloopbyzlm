"use client";

/**
 * Shared primitives for the customer app, outlet check-in and txn confirm.
 * Everything here traces to docs/DESIGN.md: cream canvas, forest/lime/marigold
 * tokens, pill CTAs ≥44px, skeletons shaped like real layout, no dead ends.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CakeSlice,
  Coffee,
  Dumbbell,
  Loader2,
  RefreshCw,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Money & numbers ──────────────────────────────────────────────────────────

/** Paise → "₹1,234.56" (Indian grouping). */
export function formatINR(paise: number): string {
  return "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/** Absolute-ish date for activity rows: "12 Mar, 4:05 pm". */
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

/** Clock time for cooldown messages: "4:35 pm". */
export function formatClock(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

// ─── Categories ───────────────────────────────────────────────────────────────

export const CATEGORIES = [
  "CAFE",
  "RESTAURANT",
  "SALON",
  "BAKERY",
  "SUPERMARKET",
  "RETAIL",
  "GYM",
  "LAUNDRY",
  "OTHER",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  CAFE: "Café",
  RESTAURANT: "Restaurant",
  SALON: "Salon",
  BAKERY: "Bakery",
  SUPERMARKET: "Supermarket",
  RETAIL: "Retail",
  GYM: "Gym",
  LAUNDRY: "Laundry",
  OTHER: "Other",
};

export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  CAFE: Coffee,
  RESTAURANT: UtensilsCrossed,
  SALON: Scissors,
  BAKERY: CakeSlice,
  SUPERMARKET: ShoppingCart,
  RETAIL: ShoppingBag,
  GYM: Dumbbell,
  LAUNDRY: Shirt,
  OTHER: Store,
};

export function categoryLabel(category: string | null | undefined): string {
  if (!category) return "Local business";
  return CATEGORY_LABELS[category as Category] ?? category;
}

export function CategoryIcon({
  category,
  className,
}: {
  category: string | null | undefined;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[(category ?? "OTHER") as Category] ?? Store;
  return <Icon className={className} aria-hidden />;
}

// ─── API types (mirror docs/API.md exactly) ───────────────────────────────────

export type ProgramSummaryT = {
  id: string;
  name: string;
  type: string;
  status: string;
  config: Record<string, unknown>;
  terms: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

export type BusinessSummaryT = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  city: string | null;
  addressLine?: string | null;
  logoUrl: string | null;
  isDemo: boolean;
};

export type BusinessListItem = BusinessSummaryT & {
  programs: ProgramSummaryT[];
  primaryOutlet: { id: string; name: string; city: string | null } | null;
};

export type RewardT = {
  id: string;
  title: string;
  description: string | null;
  cost: number;
  unit: "POINTS" | "STAMPS";
  terms?: string | null;
};

export type WalletListItem = {
  business: BusinessSummaryT;
  points: number;
  stamps: number;
  visitCount: number;
  lastVisitAt: string | null;
  activeRewards: (RewardT & { programId: string; programName: string; programType: string })[];
  programs: ProgramSummaryT[];
};

export type LedgerEntryT = {
  id: string;
  type: string;
  unit: string;
  delta: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
};

export type WalletDetailT = {
  business: BusinessSummaryT & { feedbackEnabled: boolean };
  account: {
    points: number;
    stamps: number;
    visitCount: number;
    lastVisitAt: string | null;
    createdAt: string;
  };
  ledger: LedgerEntryT[];
  programs: ProgramSummaryT[];
  rewards: (RewardT & {
    programId: string;
    programName: string;
    programType: string;
    eligible: boolean;
  })[];
  pendingRedemption: {
    id: string;
    reward: { id: string; title: string; cost: number; unit: string };
    cost: number;
    unit: string;
    createdAt: string;
  } | null;
};

export type RedemptionT = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  cost: number;
  unit: string;
  createdAt: string;
  decidedAt: string | null;
  reward: { id: string; title: string };
  business: { id: string; name: string; logoUrl: string | null; isDemo: boolean };
};

export type NotificationT = {
  id: string;
  type: string;
  title: string;
  body: string;
  businessId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type OutletResT = {
  business: BusinessSummaryT;
  outlet: { id: string; name: string; addressLine: string | null };
  program: ProgramSummaryT | null;
  programs: ProgramSummaryT[];
};

export type VisitResT = {
  business: { id: string; name: string; isDemo: boolean };
  outlet: { id: string; name: string };
  visitId: string;
  stampsAwarded: number;
  stamps: number;
  stampsToReward: number | null;
  cooldownActive: boolean;
  nextStampAt: string | null;
};

export type TxnPreviewT = {
  business: { id: string; name: string; category: string; logoUrl: string | null; isDemo: boolean };
  outlet: { id: string; name: string };
  amountPaise: number;
  note: string | null;
  expiresAt: string;
  estimatedPoints: number;
};

export type TxnConfirmResT = {
  business: { id: string; name: string };
  outlet: { id: string; name: string };
  amountPaise: number;
  pointsAwarded: number;
  balance: number;
};

// ─── Program copy (honest, config-derived — never invented numbers) ──────────

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Short line for cards: "5 visits → a reward" · "10 pts per ₹100 spent". */
export function programSummary(program: ProgramSummaryT | null | undefined): string {
  if (!program) return "Loyalty program";
  const cfg = program.config ?? {};
  switch (program.type) {
    case "STAMPS": {
      const toReward = num(cfg.stampsToReward);
      return toReward != null ? `${toReward} visits → a reward` : "1 stamp per visit";
    }
    case "STARS": {
      const per = num(cfg.starsPerVisit) ?? 1;
      const toReward = num(cfg.starsToReward);
      return toReward != null
        ? `${per} star${per === 1 ? "" : "s"} per visit → ${toReward}`
        : `${per} star${per === 1 ? "" : "s"} per visit`;
    }
    case "POINTS": {
      const rate = num(cfg.pointsPerRupeePaise);
      return rate != null ? `${rate} pts per ₹100 spent` : "Points on every spend";
    }
    case "SERVICE_COUNT": {
      const toReward = num(cfg.countToReward);
      return toReward != null ? `${toReward} visits → free service` : program.name;
    }
    case "SPEND": {
      const min = num(cfg.minSpendPaise);
      return min != null ? `Reward on spends over ${formatINR(min)}` : program.name;
    }
    default:
      return program.name;
  }
}

/** Program type chip text. */
export function programKindLabel(type: string): string {
  switch (type) {
    case "STAMPS":
      return "Stamp card";
    case "STARS":
      return "Stars";
    case "POINTS":
      return "Points";
    case "SERVICE_COUNT":
      return "Visit counter";
    case "SPEND":
      return "Spend reward";
    default:
      return "Loyalty";
  }
}

// ─── Data hook (tiny; no external state lib needed) ──────────────────────────

export type ApiState<T> = {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
};

type Payload<T> = { key: string; data: T | null; error: ApiError | null };

/** GET a path and hold the result. `path === null` skips the request. */
export function useApiData<T>(path: string | null): ApiState<T> {
  const [payload, setPayload] = useState<Payload<T>>({ key: "", data: null, error: null });
  const [tick, setTick] = useState(0);

  const key = `${path ?? ""}#${tick}`;

  useEffect(() => {
    if (!path) return;
    let active = true;
    const ac = new AbortController();
    api<T>(path, { signal: ac.signal })
      .then((d) => {
        if (active) setPayload({ key, data: d, error: null });
      })
      .catch((e: unknown) => {
        if (active)
          setPayload({
            key,
            data: null,
            error:
              e instanceof ApiError
                ? e
                : new ApiError(0, "Couldn't reach Perk Loop. Check your connection and try again."),
          });
      });
    return () => {
      active = false;
      ac.abort();
    };
  }, [path, key]);

  const loading = path !== null && payload.key !== key;
  const settled = !loading && payload.key === key;
  const reload = useCallback(() => setTick((t) => t + 1), []);

  return {
    data: settled ? payload.data : null,
    error: settled ? payload.error : null,
    loading,
    reload,
  };
}

// ─── Motion: flow reveal (620ms, stagger 60ms, once; reduced-motion safe) ────

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  /** seconds */
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduce
          ? { duration: 0.3, ease: "easeOut", delay }
          : { duration: 0.62, ease: [0.22, 1, 0.36, 1], delay }
      }
    >
      {children}
    </motion.div>
  );
}

/** Stamp/point pop for success moments. Static cue = the +N label beside it. */
export function PopIcon({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { scale: 1, opacity: 0 } : { scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={reduce ? { duration: 0.3, ease: "easeOut" } : { type: "spring", stiffness: 320, damping: 16 }}
    >
      {children}
    </motion.div>
  );
}

// ─── Building blocks ──────────────────────────────────────────────────────────

export function LogoAvatar({
  name,
  logoUrl,
  className,
}: {
  name: string;
  logoUrl?: string | null;
  className?: string;
}) {
  const initial = (name || "•").trim().charAt(0).toUpperCase();
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={cn("rounded-2xl object-cover", className ?? "h-12 w-12")}
      />
    );
  }
  return (
    <div
      aria-hidden
      className={cn(
        "flex select-none items-center justify-center rounded-2xl bg-forest-soft font-display font-bold text-forest",
        className ?? "h-12 w-12 text-lg"
      )}
    >
      {initial}
    </div>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full bg-marigold-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sienna",
        className
      )}
    >
      Demo
    </span>
  );
}

export function StatusChip({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" | string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-marigold-soft text-sienna",
    APPROVED: "bg-lime-soft text-forest",
    REJECTED: "bg-destructive/10 text-destructive",
  };
  const dot: Record<string, string> = {
    PENDING: "bg-marigold",
    APPROVED: "bg-lime",
    REJECTED: "bg-destructive",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        styles[status] ?? "bg-muted text-muted-foreground"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot[status] ?? "bg-muted-foreground")} aria-hidden />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

/**
 * Punched stamp slots — the signature loyalty object (DESIGN.md §5).
 * Empty slots are dashed inset circles; earned slots fill lime with a star.
 * Static by default — the `pop` index (optional) animates once for a fresh stamp.
 */
export function StampSlots({
  value,
  total,
  size = 26,
  className,
  onDark = false,
}: {
  value: number;
  total: number;
  size?: number;
  className?: string;
  onDark?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} aria-hidden>
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < value;
        return (
          <span
            key={i}
            className={cn(
              "flex items-center justify-center rounded-full",
              filled ? (onDark ? "bg-lime text-forest" : "bg-lime text-forest") : "bg-transparent",
            )}
            style={{
              width: size,
              height: size,
              boxShadow: filled
                ? "inset 0 -1px 2px rgba(22,51,0,0.18)"
                : onDark
                  ? "inset 0 1px 2px rgba(0,0,0,0.35)"
                  : "var(--shadow-stamp-slot)",
              border: filled ? "none" : `1.5px dashed ${onDark ? "rgba(250,247,242,0.35)" : "rgba(22,51,0,0.3)"}`,
            }}
          >
            {filled ? (
              <svg viewBox="0 0 24 24" fill="none" style={{ width: size * 0.55, height: size * 0.55 }}>
                <path
                  d="M12 2.6l2.6 5.7 6.2.7-4.6 4.2 1.2 6.1-5.4-3-5.4 3 1.2-6.1L3.2 9l6.2-.7L12 2.6z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <span className={cn("size-1 rounded-full", onDark ? "bg-white/25" : "bg-forest/20")} />
            )}
          </span>
        );
      })}
    </div>
  );
}

/** Progress ring for stamps — lime fill on forest track (DESIGN.md). */
export function BalanceRing({
  value,
  max,
  size = 84,
  stroke = 8,
  label,
  sub,
  onDark = false,
}: {
  value: number;
  max: number | null;
  size?: number;
  stroke?: number;
  label?: string;
  sub?: string;
  onDark?: boolean;
}) {
  const pct = max && max > 0 ? Math.min(1, value / max) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const track = onDark ? "rgba(250,247,242,0.18)" : "rgba(22,51,0,0.14)";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {pct > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--lime)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            style={{ transition: "stroke-dashoffset 620ms cubic-bezier(0.22,1,0.36,1)" }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span
          className={cn(
            "font-display font-bold tabular-nums",
            onDark ? "text-lime" : "text-foreground"
          )}
        >
          {label ?? value}
        </span>
        {sub && (
          <span
            className={cn(
              "mt-0.5 text-[11px] font-medium",
              onDark ? "text-lime/70" : "text-muted-foreground"
            )}
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  line,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  line: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
      </div>
      <p className="font-display text-base font-semibold">{title}</p>
      <p className="max-w-[36ch] text-sm text-muted-foreground">{line}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  status,
}: {
  message: string;
  onRetry?: () => void;
  status?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-destructive/25 bg-destructive/5 px-6 py-8 text-center">
      <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
      <p className="font-display text-base font-semibold">
        {status === 0 ? "You're offline" : "Something went wrong"}
      </p>
      <p className="max-w-[40ch] text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" className="press mt-2 h-10 rounded-full" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden /> Try again
        </Button>
      )}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} aria-hidden />;
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Business card ────────────────────────────────────────────────────────────

export function BusinessCard({
  business,
  onClick,
  compact = false,
}: {
  business: Pick<BusinessSummaryT, "name" | "category" | "city" | "logoUrl" | "isDemo"> & {
    programs?: ProgramSummaryT[];
  };
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "press w-full rounded-[18px] border border-forest/8 bg-card p-4 text-left shadow-card transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
        compact ? "flex w-44 shrink-0 flex-col gap-3" : "flex items-start gap-3"
      )}
    >
      <LogoAvatar name={business.name} logoUrl={business.logoUrl} className="h-12 w-12 text-lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-display text-sm font-bold tracking-[-0.01em] text-ink">{business.name}</p>
          {business.isDemo && <DemoBadge />}
        </div>
        <p className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
          {categoryLabel(business.category)}
          {business.city ? ` · ${business.city}` : ""}
        </p>
        {business.programs?.[0] && (
          <p className="mt-1.5 line-clamp-2 text-xs font-semibold text-forest">
            {programSummary(business.programs[0])}
          </p>
        )}
      </div>
    </button>
  );
}
