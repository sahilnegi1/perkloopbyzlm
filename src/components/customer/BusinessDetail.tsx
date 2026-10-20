"use client";

/**
 * Business detail (#/app/business/{id}) — public profile + the signed-in
 * customer's wallet: balance ring, rewards with eligibility, redeem (PENDING
 * request flow), feedback dialog and the ledger.
 */

import { useState } from "react";
import {
  BalanceRing,
  DemoBadge,
  EmptyState,
  ErrorState,
  formatWhen,
  ListSkeleton,
  LogoAvatar,
  programKindLabel,
  programSummary,
  Reveal,
  Spinner,
  StampSlots,
  StatusChip,
  useApiData,
  type ProgramSummaryT,
  type RewardT,
  type WalletDetailT,
} from "@/components/customer/shared";
import { navigate } from "@/lib/hash-router";
import { useSession } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { post, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  Clock,
  MapPin,
  QrCode,
  ScanLine,
  Star,
  Ticket,
} from "lucide-react";

type BusinessDetailRes = {
  business: {
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
  };
  programs: (ProgramSummaryT & { rewards: RewardT[] })[];
  outlets: { id: string; name: string; addressLine: string | null; isPrimary: boolean }[];
};

function ProgramCard({ program, delay }: { program: ProgramSummaryT; delay: number }) {
  return (
    <Reveal delay={delay}>
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-sm font-bold">{program.name}</p>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {programKindLabel(program.type)}
          </span>
        </div>
        <p className="mt-1 text-sm font-medium text-forest">{programSummary(program)}</p>
        {program.terms && (
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{program.terms}</p>
        )}
      </div>
    </Reveal>
  );
}

function FeedbackDialog({
  businessId,
  businessName,
  open,
  onOpenChange,
}: {
  businessId: string;
  businessName: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const TAGS = ["Friendly staff", "Quick service", "Good value", "Clean space", "Great quality"];

  const submit = async () => {
    setError(null);
    if (rating < 1) {
      setError("Tap a star to rate your experience.");
      return;
    }
    setSubmitting(true);
    try {
      await post("/api/feedback", {
        businessId,
        rating,
        comment: comment.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      toast({
        title: "Feedback sent",
        description: `Thanks — ${businessName} will see your rating.`,
      });
      onOpenChange(false);
      setRating(0);
      setTags([]);
      setComment("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't send feedback. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl" showCloseButton={open && !submitting}>
        <DialogHeader>
          <DialogTitle className="font-display text-left">Rate {businessName}</DialogTitle>
          <DialogDescription className="text-left">
            Honest ratings help other customers — the shop sees them in its dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center gap-2" role="radiogroup" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                onClick={() => setRating(n)}
                className="press rounded-full p-1.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
              >
                <Star
                  className={cn(
                    "h-8 w-8 transition-colors",
                    n <= rating ? "fill-marigold text-marigold" : "text-input"
                  )}
                  aria-hidden
                />
              </button>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {TAGS.map((t) => {
              const active = tags.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setTags((prev) => (active ? prev.filter((x) => x !== t) : [...prev, t]))
                  }
                  className={cn(
                    "press h-9 rounded-full border px-3.5 text-sm font-medium transition-colors",
                    active
                      ? "border-forest bg-forest text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fb-comment" className="text-xs text-muted-foreground">
              Anything to add? (optional)
            </Label>
            <Textarea
              id="fb-comment"
              value={comment}
              maxLength={500}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What stood out on your visit?"
              className="min-h-20 rounded-xl"
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={() => void submit()}
            disabled={submitting || rating < 1}
            className="press h-11 w-full rounded-full font-semibold"
          >
            {submitting && <Spinner />}
            Send feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BusinessDetail({ businessId, backTo }: { businessId: string; backTo: string }) {
  const { user } = useSession();
  const isCustomer = user?.role === "CUSTOMER";

  const biz = useApiData<BusinessDetailRes>(`/api/businesses/${businessId}`);
  const wallet = useApiData<WalletDetailT>(
    isCustomer ? `/api/wallet/${businessId}` : null
  );

  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const goBack = () => navigate(backTo);

  const redeem = async (rewardId: string) => {
    setRedeemingId(rewardId);
    try {
      await post(`/api/wallet/${businessId}/redeem`, { rewardId });
      toast({
        title: "Request sent — the shop will confirm it",
        description: "You'll get a notification once it's decided. Your balance is untouched until then.",
      });
      wallet.reload();
    } catch (e) {
      toast({
        title: "Couldn't send the request",
        description: e instanceof ApiError ? e.message : "Something went wrong. Try again.",
        variant: "destructive",
      });
    } finally {
      setRedeemingId(null);
    }
  };

  // ── Loading / error / not-found for the business itself ──
  if (biz.loading) {
    return (
      <div className="space-y-4 px-4 pb-8 pt-4">
        <div className="h-9 w-9" />
        <ListSkeleton rows={4} />
      </div>
    );
  }
  if (biz.error && biz.error.status === 404) {
    return (
      <div className="px-4 pb-8 pt-6">
        <EmptyState
          icon={QrCode}
          title="Business not found"
          line="This business isn't on Perk Loop anymore, or the link is wrong."
          action={
            <Button onClick={() => navigate("#/app/discover")} className="press h-11 rounded-full px-5 font-semibold">
              Browse businesses
            </Button>
          }
        />
      </div>
    );
  }
  if (biz.error) {
    return (
      <div className="px-4 pb-8 pt-6">
        <ErrorState message={biz.error.message} onRetry={biz.reload} />
      </div>
    );
  }

  const b = biz.data!.business;
  const addressParts = [b.addressLine, b.city, b.state, b.pincode].filter(Boolean);
  const walletLoaded = isCustomer && !wallet.loading && !wallet.error && wallet.data;
  const joinState = isCustomer && !wallet.loading && wallet.error?.status === 404;

  const stampProgram = wallet.data?.programs.find((p) => p.type === "STAMPS") ??
    wallet.data?.programs.find((p) => p.type === "STARS");
  const stampsToReward =
    stampProgram && typeof stampProgram.config.stampsToReward === "number"
      ? stampProgram.config.stampsToReward
      : null;

  return (
    <div className="pb-8">
      {/* Header with back */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/90 px-3 py-2.5 backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          onClick={goBack}
          aria-label="Go back"
          className="press h-10 w-10 rounded-full"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </Button>
        <p className="truncate font-display text-sm font-semibold">{b.name}</p>
      </div>

      <div className="space-y-6 px-4 pt-5">
        {/* Hero */}
        <Reveal>
          <div className="rounded-[20px] border border-forest/8 bg-card p-5 shadow-card">
            <div className="flex items-start gap-4">
              <LogoAvatar name={b.name} logoUrl={b.logoUrl} className="h-16 w-16 text-2xl" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-xl font-extrabold tracking-[-0.02em] text-ink">{b.name}</h1>
                  {b.isDemo && <DemoBadge />}
                </div>
                <p className="mt-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {[b.category && b.category.charAt(0) + b.category.slice(1).toLowerCase(), b.city]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {addressParts.length > 0 && (
                  <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    {addressParts.join(", ")}
                  </p>
                )}
              </div>
            </div>
            {b.description && (
              <p className="mt-3 border-t border-border pt-3 text-sm leading-relaxed text-muted-foreground">
                {b.description}
              </p>
            )}
            {biz.data!.outlets.length > 1 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {biz.data!.outlets.length} outlets · main: {biz.data!.outlets[0].name}
              </p>
            )}
          </div>
        </Reveal>

        {/* Your balance / join state */}
        {isCustomer && wallet.loading && <ListSkeleton rows={2} />}
        {isCustomer && wallet.error && wallet.error.status !== 404 && (
          <ErrorState message={wallet.error.message} onRetry={wallet.reload} />
        )}
        {joinState && (
          <Reveal delay={0.06}>
            <EmptyState
              icon={ScanLine}
              title="You haven't collected here yet"
              line={`Scan ${b.name}'s shop QR code to check in and join their loyalty program — then your stamps and points will appear here.`}
              action={
                <Button
                  onClick={() => navigate("#/app/scan")}
                  className="press h-11 rounded-full bg-forest px-5 font-semibold text-primary-foreground"
                >
                  <ScanLine className="h-4 w-4" aria-hidden />
                  Scan their QR code
                </Button>
              }
            />
          </Reveal>
        )}

        {walletLoaded && (
          <Reveal delay={0.06}>
            <div className="relative overflow-hidden rounded-[24px] bg-forest p-5 text-primary-foreground shadow-card">
              <div aria-hidden className="absolute -top-16 -right-12 h-44 w-44 rounded-full bg-lime/25 blur-3xl" />
              <div aria-hidden className="dot-grid-dark absolute inset-0 opacity-70" />
              <div className="relative">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
                Your balance here
              </p>
              <div className="mt-3 flex items-center justify-between gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="font-display text-3xl font-extrabold tabular-nums text-lime">
                      {wallet.data!.account.points}
                    </p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/55">points</p>
                  </div>
                  <div>
                    <p className="font-display text-3xl font-extrabold tabular-nums text-marigold">
                      {wallet.data!.account.stamps}
                    </p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/55">stamps</p>
                  </div>
                </div>
                <div className="text-center">
                  <BalanceRing
                    value={wallet.data!.account.stamps}
                    max={stampsToReward}
                    onDark
                    sub={stampsToReward ? "to reward" : "stamps"}
                  />
                  {stampsToReward ? (
                    <p className="mt-1.5 text-[11px] text-white/65">
                      {Math.max(0, stampsToReward - wallet.data!.account.stamps)} more to go
                    </p>
                  ) : null}
                </div>
              </div>
              {stampsToReward ? (
                <div className="mt-4 rounded-2xl bg-white/8 p-3.5 ring-1 ring-white/10">
                  <StampSlots
                    value={Math.min(wallet.data!.account.stamps, stampsToReward)}
                    total={stampsToReward}
                    size={24}
                    onDark
                  />
                </div>
              ) : null}
              <p className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-3 text-xs text-white/60">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {wallet.data!.account.visitCount} visit{wallet.data!.account.visitCount === 1 ? "" : "s"}
                {wallet.data!.account.lastVisitAt
                  ? ` · last on ${formatWhen(wallet.data!.account.lastVisitAt)}`
                  : ""}
              </p>
              </div>
            </div>
          </Reveal>
        )}

        {/* Pending redemption */}
        {walletLoaded && wallet.data!.pendingRedemption && (
          <Reveal delay={0.1}>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-marigold/50 bg-marigold-soft p-4">
              <div>
                <p className="text-sm font-semibold text-sienna">
                  “{wallet.data!.pendingRedemption.reward.title}” requested
                </p>
                <p className="mt-0.5 text-xs text-sienna/80">
                  Sent {formatWhen(wallet.data!.pendingRedemption.createdAt)} — the shop will confirm
                  it. You can't request another reward here until then.
                </p>
              </div>
              <StatusChip status="PENDING" />
            </div>
          </Reveal>
        )}

        {/* Rewards */}
        {walletLoaded && wallet.data!.rewards.length > 0 && (
          <Reveal delay={0.12}>
            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-extrabold tracking-[-0.01em] text-ink">Rewards</h2>
              <ul className="space-y-2.5">
                {wallet.data!.rewards.map((r) => {
                  const missing = Math.max(0, r.cost - (r.unit === "POINTS"
                    ? wallet.data!.account.points
                    : wallet.data!.account.stamps));
                  const canRequest = r.eligible && !wallet.data!.pendingRedemption;
                  return (
                    <li
                      key={r.id}
                      className={cn(
                        "rounded-2xl border p-4 transition-colors",
                        canRequest
                          ? "border-lime bg-lime-soft"
                          : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-display text-sm font-bold">
                            <Ticket className="h-4 w-4 shrink-0 text-forest" aria-hidden />
                            {r.title}
                          </p>
                          {r.description && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{r.description}</p>
                          )}
                          <p className="mt-1.5 text-sm font-semibold tabular-nums">
                            {r.cost} {r.unit === "POINTS" ? "pts" : "stamps"}
                          </p>
                        </div>
                        {canRequest ? (
                          <Button
                            onClick={() => void redeem(r.id)}
                            disabled={redeemingId !== null}
                            className="press h-10 shrink-0 rounded-full bg-forest px-4 font-semibold text-primary-foreground"
                          >
                            {redeemingId === r.id && <Spinner />}
                            Redeem
                          </Button>
                        ) : null}
                      </div>
                      {!canRequest && (
                        <p className="mt-2 border-t border-black/5 pt-2 text-xs font-medium text-muted-foreground">
                          {wallet.data!.pendingRedemption
                            ? "Waiting on your pending request at this shop."
                            : `${missing} more ${r.unit === "POINTS" ? "points" : "stamps"} needed`}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          </Reveal>
        )}

        {/* Feedback */}
        {walletLoaded && b.feedbackEnabled && (
          <Reveal delay={0.16}>
            <Button
              variant="outline"
              onClick={() => setFeedbackOpen(true)}
              className="press h-11 w-full rounded-full font-semibold"
            >
              <Star className="h-4 w-4 text-marigold" aria-hidden />
              Rate this shop
            </Button>
          </Reveal>
        )}

        {/* Programs */}
        {biz.data!.programs.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-[17px] font-extrabold tracking-[-0.01em] text-ink">How earning works</h2>
            {biz.data!.programs.map((p, i) => (
              <ProgramCard key={p.id} program={p} delay={0.06 * i} />
            ))}
          </section>
        )}

        {/* Ledger */}
        {walletLoaded && wallet.data!.ledger.length > 0 && (
          <Reveal delay={0.18}>
            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-extrabold tracking-[-0.01em] text-ink">Recent movements</h2>
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {wallet.data!.ledger.slice(0, 8).map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{l.description ?? l.type}</p>
                      <p className="text-xs text-muted-foreground">{formatWhen(l.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "text-sm font-bold tabular-nums",
                          l.delta >= 0 ? "text-forest" : "text-destructive"
                        )}
                      >
                        {l.delta >= 0 ? "+" : "−"}
                        {Math.abs(l.delta)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">bal {l.balanceAfter}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        )}

        {/* Offline join prompt for customers arriving from a shop QR (no account) */}
        {!isCustomer && (
          <Reveal delay={0.06}>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">
                Sign in with a customer account to collect stamps and points here.
              </p>
              <Button
                variant="outline"
                onClick={() => navigate("#/auth?role=customer")}
                className="press h-10 shrink-0 rounded-full px-4 font-semibold"
              >
                Sign in
              </Button>
            </div>
          </Reveal>
        )}
      </div>

      <FeedbackDialog
        businessId={b.id}
        businessName={b.name}
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
      />
    </div>
  );
}
