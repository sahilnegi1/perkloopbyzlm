"use client";

/**
 * TxnConfirm (#/t/{token}) — one-time payment QR. Preview with expiry
 * countdown, atomic confirm, "+N points" success, honest 409/410/404 states.
 */

import { useEffect, useState } from "react";
import {
  EmptyState,
  ErrorState,
  formatINR,
  LogoAvatar,
  PopIcon,
  Reveal,
  Spinner,
  useApiData,
  type TxnConfirmResT,
  type TxnPreviewT,
} from "@/components/customer/shared";
import { MerchantOwnerGate } from "@/components/customer/MerchantOwnerGate";
import { navigate } from "@/lib/hash-router";
import { useSession } from "@/lib/store";
import { post, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { BadgeCheck, CircleAlert, Clock, Coins, ReceiptText, Wallet } from "lucide-react";

function storeReturnPath(token: string) {
  try {
    sessionStorage.setItem("pl_return_to", `#/t/${token}`);
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

function mmss(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function TxnConfirm({ token }: { token: string }) {
  const { user, loading } = useSession();
  const { data, error, loading: fetching, reload } = useApiData<TxnPreviewT>(
    token && user?.role === "CUSTOMER" ? `/api/qr/txn/${encodeURIComponent(token)}` : null
  );

  const [now, setNow] = useState(() => Date.now());
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [result, setResult] = useState<TxnConfirmResT | null>(null);

  // Tick the expiry countdown while a preview is on screen.
  useEffect(() => {
    if (!data) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [data]);

  const expiresAtMs = data ? new Date(data.expiresAt).getTime() : null;
  const remainingMs = expiresAtMs === null ? null : Math.max(0, expiresAtMs - now);
  const expired = remainingMs !== null && remainingMs <= 0;

  // Signed-out → redirect to auth and come back to this exact token afterwards.
  useEffect(() => {
    if (!loading && !user) {
      storeReturnPath(token);
      navigate("#/auth?role=customer");
    }
  }, [loading, user, token]);

  // Session states
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
        <MerchantOwnerGate via="txn" />
      </Screen>
    );
  }
  if (!user) {
    return (
      <Screen>
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <p className="font-display text-lg font-bold">Sign in to confirm</p>
          <p className="text-sm text-muted-foreground">Taking you to sign in…</p>
          <Spinner className="text-muted-foreground" />
        </div>
      </Screen>
    );
  }

  const goToAuthAfter401 = () => {
    storeReturnPath(token);
    navigate("#/auth?role=customer");
  };

  // ── Preview states ──
  if (fetching) {
    return (
      <Screen>
        <div className="flex items-center justify-center py-24">
          <Spinner className="h-6 w-6 text-muted-foreground" />
        </div>
      </Screen>
    );
  }
  if (error && (error.status === 409 || error.status === 410)) {
    const used = error.status === 409;
    return (
      <Screen>
        <div className="py-14">
          <Reveal>
            <EmptyState
              icon={used ? CircleAlert : Clock}
              title={used ? "This code has already been used" : "This code has expired"}
              line={
                used
                  ? "One-time codes work once. If this wasn't you, ask the shop to check their transaction list."
                  : "Payment codes stay alive for 5 minutes. Ask the merchant to show a fresh one."
              }
              action={
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => navigate("#/app")}
                    className="press h-11 rounded-full px-5 font-semibold"
                  >
                    Open my wallet
                  </Button>
                  {used && (
                    <Button
                      variant="outline"
                      onClick={reload}
                      className="press h-11 rounded-full px-5 font-semibold"
                    >
                      Check again
                    </Button>
                  )}
                </div>
              }
            />
          </Reveal>
        </div>
      </Screen>
    );
  }
  if (error && error.status === 404) {
    return (
      <Screen>
        <div className="py-14">
          <Reveal>
            <EmptyState
              icon={ReceiptText}
              title="This code is invalid"
              line="We couldn't find this payment code. Ask the shop to scan or show it again."
              action={
                <Button onClick={() => navigate("#/app")} className="press h-11 rounded-full px-5 font-semibold">
                  Open my wallet
                </Button>
              }
            />
          </Reveal>
        </div>
      </Screen>
    );
  }
  if (error && error.status === 401) {
    goToAuthAfter401();
    return (
      <Screen>
        <div className="flex flex-col items-center gap-3 py-24">
          <Spinner className="text-muted-foreground" />
        </div>
      </Screen>
    );
  }
  if (error) {
    return (
      <Screen>
        <div className="py-14">
          <ErrorState message={error.message} onRetry={reload} />
        </div>
      </Screen>
    );
  }
  if (!data) return null;

  const confirm = async () => {
    setConfirming(true);
    setConfirmError(null);
    try {
      const res = await post<TxnConfirmResT>(
        `/api/qr/txn/${encodeURIComponent(token)}/confirm`
      );
      setResult(res);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        goToAuthAfter401();
        return;
      }
      if (e instanceof ApiError && (e.status === 409 || e.status === 410)) {
        reload(); // re-render into the honest used/expired screen
        return;
      }
      setConfirmError(e instanceof ApiError ? e.message : "Couldn't confirm. Try again.");
    } finally {
      setConfirming(false);
    }
  };

  // ── Success ──
  if (result) {
    return (
      <Screen>
        <div className="space-y-6 pt-6 text-center">
          <Reveal>
            <div className="rounded-2xl bg-forest p-8 text-primary-foreground shadow-[0_12px_32px_rgba(26,29,22,0.12)]">
              <PopIcon className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-lime">
                <Coins className="h-9 w-9 text-forest" aria-hidden />
              </PopIcon>
              <p className="mt-4 font-display text-5xl font-bold tabular-nums text-lime">
                +{result.pointsAwarded}
              </p>
              <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-primary-foreground/70">
                points earned
              </p>
              <p className="mt-4 border-t border-white/10 pt-4 text-sm text-primary-foreground/75">
                {result.pointsAwarded > 0
                  ? `New balance at ${result.business.name}: `
                  : `Visit recorded at ${result.business.name}.`}
                {result.pointsAwarded > 0 && (
                  <span className="font-display text-base font-bold tabular-nums text-lime">
                    {result.balance} points
                  </span>
                )}
                {result.pointsAwarded === 0 && (
                  <span className="font-display text-base font-bold text-lime">
                    {" "}
                    Balance: {result.balance} points
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-primary-foreground/50">
                {formatINR(result.amountPaise)} · {result.outlet.name}
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="flex flex-col gap-2.5">
              <Button
                onClick={() => navigate(`#/app/business/${result.business.id}`)}
                className="press h-12 rounded-full text-base font-semibold"
              >
                <Wallet className="h-4 w-4" aria-hidden />
                View wallet
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("#/app")}
                className="press h-11 rounded-full font-semibold"
              >
                Back to home
              </Button>
            </div>
          </Reveal>
        </div>
      </Screen>
    );
  }

  // ── Countdown expired while previewing ──
  if (expired) {
    return (
      <Screen>
        <div className="py-14">
          <Reveal>
            <EmptyState
              icon={Clock}
              title="This code has expired"
              line="Payment codes stay alive for 5 minutes. Ask the merchant to show a fresh one."
              action={
                <Button onClick={reload} className="press h-11 rounded-full px-5 font-semibold">
                  Check again
                </Button>
              }
            />
          </Reveal>
        </div>
      </Screen>
    );
  }

  // ── Preview + confirm ──
  return (
    <Screen>
      <div className="space-y-5 pt-2">
        <Reveal>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(26,29,22,0.06)]">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ReceiptText className="h-3.5 w-3.5" aria-hidden />
                Payment request
              </p>
              <span
                className={
                  remainingMs !== null && remainingMs < 60_000
                    ? "inline-flex items-center gap-1 rounded-full bg-marigold-soft px-2.5 py-1 text-xs font-bold tabular-nums text-sienna"
                    : "inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-bold tabular-nums text-muted-foreground"
                }
              >
                <Clock className="h-3 w-3" aria-hidden />
                {remainingMs !== null ? mmss(remainingMs) : "—"}
              </span>
            </div>

            <div className="mt-4 flex items-start gap-4">
              <LogoAvatar name={data.business.name} logoUrl={data.business.logoUrl} className="h-14 w-14 text-xl" />
              <div className="min-w-0">
                <h1 className="font-display text-lg font-bold tracking-tight">{data.business.name}</h1>
                <p className="text-sm text-muted-foreground">{data.outlet.name}</p>
                {data.note && <p className="mt-1 text-sm text-muted-foreground">“{data.note}”</p>}
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-muted px-4 py-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Amount to confirm
              </p>
              <p className="mt-1 font-display text-4xl font-bold tabular-nums">
                {formatINR(data.amountPaise)}
              </p>
            </div>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-sm text-muted-foreground">
              <Coins className="h-4 w-4 text-marigold" aria-hidden />
              {data.estimatedPoints > 0
                ? `You'll earn about ${data.estimatedPoints} points for this purchase.`
                : "This shop credits points on qualifying purchases."}
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.06}>
          <div className="space-y-3">
            <Button
              onClick={() => void confirm()}
              disabled={confirming}
              className="press h-14 w-full rounded-full text-base font-bold"
            >
              {confirming ? <Spinner /> : <BadgeCheck className="h-5 w-5" aria-hidden />}
              Confirm {formatINR(data.amountPaise)}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              One-time code — confirming marks it used. Only confirm when the amount matches your bill.
            </p>
            {confirmError && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-center text-sm font-medium text-destructive" role="alert">
                {confirmError}
              </p>
            )}
          </div>
        </Reveal>
      </div>
    </Screen>
  );
}
