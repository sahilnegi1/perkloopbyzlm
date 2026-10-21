"use client";

/**
 * OutletEntry (#/o/{code}) — static QR check-in landing. Public business card;
 * customers check in (+1 stamp, 30-min cooldown honoured honestly), others are
 * routed to sign-in or shown the merchant-owner gate.
 */

import { useState } from "react";
import {
  DemoBadge,
  EmptyState,
  ErrorState,
  formatClock,
  LogoAvatar,
  PopIcon,
  programSummary,
  Reveal,
  Spinner,
  useApiData,
  categoryLabel,
  type OutletResT,
  type VisitResT,
} from "@/components/customer/shared";
import { MerchantOwnerGate } from "@/components/customer/MerchantOwnerGate";
import { navigate } from "@/lib/hash-router";
import { useSession } from "@/lib/store";
import { post, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Clock, HelpCircle, LogIn, QrCode, ScanLine, Stamp, Wallet } from "lucide-react";

function storeReturnPath(code: string) {
  try {
    sessionStorage.setItem("pl_return_to", `#/o/${code}`);
  } catch {
    /* private mode */
  }
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center bg-background">
      <div className="w-full max-w-md px-5 pb-10 pt-6">{children}</div>
    </div>
  );
}

export function OutletEntry({ code }: { code: string }) {
  const { user, loading } = useSession();
  const { data, error, loading: fetching, reload } = useApiData<OutletResT>(
    code ? `/api/outlets/${encodeURIComponent(code)}` : null
  );

  const [checkingIn, setCheckingIn] = useState(false);
  const [visit, setVisit] = useState<VisitResT | null>(null);
  const [visitError, setVisitError] = useState<string | null>(null);

  const checkIn = async () => {
    setCheckingIn(true);
    setVisitError(null);
    try {
      const res = await post<VisitResT>(`/api/outlets/${encodeURIComponent(code)}/visit`);
      setVisit(res);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        storeReturnPath(code);
        navigate("#/auth?role=customer");
        return;
      }
      setVisitError(e instanceof ApiError ? e.message : "Couldn't record the visit. Try again.");
    } finally {
      setCheckingIn(false);
    }
  };

  const goToAuth = () => {
    storeReturnPath(code);
    navigate("#/auth?role=customer");
  };

  // ── Session loading / merchant gate ──
  if (loading) {
    return (
      <Screen>
        <div className="flex flex-col items-center gap-3 py-24">
          <img src="/logo.svg" alt="" className="h-12 w-12" />
          <Spinner className="text-muted-foreground" />
        </div>
      </Screen>
    );
  }
  if (user?.role === "MERCHANT_OWNER") {
    return (
      <Screen>
        <MerchantOwnerGate via="outlet" />
      </Screen>
    );
  }

  // ── Outlet data ──
  if (fetching) {
    return (
      <Screen>
        <div className="flex items-center justify-center py-24">
          <Spinner className="h-6 w-6 text-muted-foreground" />
        </div>
      </Screen>
    );
  }
  if (error && error.status === 404) {
    return (
      <Screen>
        <div className="py-16">
          <Reveal>
            <EmptyState
              icon={QrCode}
              title="This code is not valid"
              line="The QR code doesn't match any shop on Reward Jar. Double-check you scanned the right poster, or ask the shop for help."
              action={
                <Button onClick={() => navigate("#/")} className="press h-11 rounded-full px-5 font-semibold">
                  Open Reward Jar
                </Button>
              }
            />
          </Reveal>
        </div>
      </Screen>
    );
  }
  if (error) {
    return (
      <Screen>
        <div className="py-16">
          <ErrorState message={error.message} onRetry={reload} />
        </div>
      </Screen>
    );
  }
  if (!data) return null;

  const { business, outlet, program } = data;
  const b = business;

  return (
    <Screen>
      <div className="space-y-5 pt-2">
        {/* Shop card */}
        <Reveal>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(26,29,22,0.06)]">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ScanLine className="h-3.5 w-3.5" aria-hidden />
              You're at
            </div>
            <div className="mt-3 flex items-start gap-4">
              <LogoAvatar name={b.name} logoUrl={b.logoUrl} className="h-16 w-16 text-2xl" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-xl font-bold tracking-tight">{b.name}</h1>
                  {b.isDemo && <DemoBadge />}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {[
                    categoryLabel(b.category),
                    b.city,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {outlet.name}
                  {outlet.addressLine ? ` · ${outlet.addressLine}` : ""}
                </p>
              </div>
            </div>
            {program && (
              <div className="mt-4 rounded-xl bg-lime-soft px-4 py-3">
                <p className="text-sm font-semibold text-forest">{programSummary(program)}</p>
                {program.terms && (
                  <p className="mt-1 text-xs leading-relaxed text-forest/70">{program.terms}</p>
                )}
              </div>
            )}
          </div>
        </Reveal>

        {/* Signed-out → honest sign-in CTA (return path already stored) */}
        {!user && (
          <Reveal delay={0.06}>
            <div className="space-y-3 rounded-2xl border border-border bg-card p-5 text-center">
              <p className="font-display text-base font-bold">Sign in to start earning</p>
              <p className="text-sm text-muted-foreground">
                A customer account keeps your stamps and points in one place — sign in or register
                in under a minute.
              </p>
              <Button
                onClick={goToAuth}
                className="press h-12 w-full rounded-full text-base font-semibold"
              >
                <LogIn className="h-4 w-4" aria-hidden />
                Sign in to start earning
              </Button>
              <button
                type="button"
                onClick={() => navigate("#/")}
                className="press mx-auto block text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                What is Reward Jar?
              </button>
            </div>
          </Reveal>
        )}

        {/* Customer check-in */}
        {user?.role === "CUSTOMER" && !visit && (
          <Reveal delay={0.06}>
            <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">
                Checked in at the counter? Record your visit to collect a stamp.
              </p>
              <Button
                onClick={() => void checkIn()}
                disabled={checkingIn}
                className="press h-12 w-full rounded-full text-base font-semibold"
              >
                {checkingIn ? <Spinner /> : <Stamp className="h-4 w-4" aria-hidden />}
                Check in & earn
              </Button>
              {visitError && (
                <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive" role="alert">
                  {visitError}
                </p>
              )}
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                One stamp per visit, at most one every 30 minutes — the shop sets the reward goal.
              </p>
            </div>
          </Reveal>
        )}

        {/* Visit result — success pop or honest cooldown */}
        {visit && (
          <Reveal delay={0.06}>
            <div
              className={
                visit.stampsAwarded > 0
                  ? "rounded-2xl bg-forest p-6 text-center text-primary-foreground shadow-[0_12px_32px_rgba(26,29,22,0.12)]"
                  : "rounded-2xl border border-marigold/50 bg-marigold-soft p-6 text-center"
              }
            >
              {visit.stampsAwarded > 0 ? (
                <>
                  <PopIcon className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lime">
                    <Stamp className="h-7 w-7 text-forest" aria-hidden />
                  </PopIcon>
                  <p className="mt-3 font-display text-3xl font-bold text-lime">
                    +{visit.stampsAwarded} stamp{visit.stampsAwarded === 1 ? "" : "s"}
                  </p>
                  <p className="mt-1 text-sm text-primary-foreground/75">
                    {visit.stampsToReward != null
                      ? `${visit.stamps} of ${visit.stampsToReward} towards your next reward`
                      : "Visit recorded at " + visit.business.name}
                  </p>
                </>
              ) : visit.cooldownActive ? (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-marigold">
                    <Clock className="h-7 w-7 text-forest" aria-hidden />
                  </div>
                  <p className="mt-3 font-display text-xl font-bold text-sienna">Visit recorded</p>
                  <p className="mt-1 text-sm text-sienna/90">
                    Next stamp available at {formatClock(visit.nextStampAt)} — stamps need a 30-minute
                    gap between visits.
                  </p>
                </>
              ) : (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Stamp className="h-7 w-7 text-muted-foreground" aria-hidden />
                  </div>
                  <p className="mt-3 font-display text-xl font-bold">Visit recorded</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This shop doesn't run a stamp card — points from purchases appear in your wallet
                    when you confirm a payment QR.
                  </p>
                </>
              )}
            </div>
          </Reveal>
        )}

        {/* Post-visit actions */}
        {visit && (
          <Reveal delay={0.12}>
            <div className="flex flex-col gap-2.5">
              <Button
                onClick={() => navigate(`#/app/business/${visit.business.id}`)}
                className="press h-12 rounded-full text-base font-semibold"
              >
                <Wallet className="h-4 w-4" aria-hidden />
                Open my wallet for this shop
              </Button>
              <Button
                variant="outline"
                onClick={() => void checkIn()}
                disabled={checkingIn}
                className="press h-11 rounded-full font-semibold"
              >
                {checkingIn ? <Spinner /> : <Stamp className="h-4 w-4" aria-hidden />}
                Check in again
              </Button>
            </div>
          </Reveal>
        )}
      </div>
    </Screen>
  );
}
