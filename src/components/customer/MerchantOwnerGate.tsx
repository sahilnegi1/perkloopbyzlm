"use client";

/**
 * Honest gate for MERCHANT_OWNER users opening customer routes: wallet and
 * visit endpoints require a CUSTOMER session, so we explain the switch instead
 * of faking a "browse as customer" mode that would 403.
 */

import { useState } from "react";
import { Store, UserRound } from "lucide-react";
import { navigate } from "@/lib/hash-router";
import { useSession } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/customer/shared";

export function MerchantOwnerGate({ via }: { via: string }) {
  const { user, logout } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      navigate("#/");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Reveal className="px-5 py-10">
      <div className="mx-auto max-w-sm space-y-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-forest-soft">
          <Store className="h-7 w-7 text-forest" aria-hidden />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display text-xl font-bold">You're signed in as a business owner</h1>
          <p className="text-sm text-muted-foreground">
            {via === "outlet"
              ? "Shop check-ins and stamp cards work from a customer account. Your business-owner account runs the merchant dashboard instead."
              : via === "txn"
                ? "Confirming a payment QR needs a customer account — business-owner accounts collect rewards for your customers, not for you."
                : "The wallet, visits and rewards in this app belong to customer accounts. Your account is set up to run a business on Perk Loop."}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 text-left">
          <p className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-forest" aria-hidden />
            <span>
              To browse and collect as a customer, sign out and register a separate customer
              account with your personal number or email.
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <Button
            onClick={() => navigate("#/merchant")}
            className="press h-12 rounded-full text-base font-semibold"
          >
            <Store className="h-4 w-4" aria-hidden />
            Open merchant dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => void signOut()}
            disabled={signingOut}
            className="press h-12 rounded-full text-base font-semibold"
          >
            Sign out{user?.name ? ` (${user.name.split(" ")[0]})` : ""}
          </Button>
        </div>
      </div>
    </Reveal>
  );
}
