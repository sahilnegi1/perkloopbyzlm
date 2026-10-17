"use client";

/**
 * Auth screen — split layout on desktop (forest brand panel / cream form),
 * single column on mobile. The flow itself lives in components/auth/AuthFlow.
 */

import { AuthFlow } from "@/components/auth/AuthFlow";
import { Reveal } from "@/components/customer/shared";

function BrandPanel() {
  return (
    <aside className="bg-forest-hero grain-dark relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* Subtle lime glow — flat brand color family, no gradients */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-lime/15 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-lime/10 blur-2xl"
      />
      <div className="relative flex items-center gap-3">
        <img src="/logo.svg" alt="" className="h-10 w-10" />
        <span className="font-display text-lg font-bold text-primary-foreground">Perk Loop</span>
      </div>
      <div className="relative max-w-md space-y-5">
        <h2 className="font-display text-[2.6rem] font-extrabold leading-[1.08] tracking-[-0.02em] text-[#FAF7F2]">
          Your trust matters. Your loyalty matters. And you matter.
        </h2>
        <p className="text-base text-primary-foreground/80">
          Collect stamps and points at the local shops you love — with real balances you can
          check any time.
        </p>
      </div>
      <p className="relative text-sm text-primary-foreground/60">Shop Local. Earn Rewards. Come Back.</p>
    </aside>
  );
}

export function AuthView({
  initialRole,
  initialMode,
}: {
  initialRole: "customer" | "merchant";
  initialMode: "login" | "register";
}) {
  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[1.1fr_1fr]">
      <BrandPanel />
      <main className="flex min-h-dvh flex-col px-5 py-8 sm:px-8 lg:min-h-0 lg:justify-center lg:py-12">
        <div className="mx-auto mb-6 flex items-center gap-2.5 lg:hidden">
          <img src="/logo.svg" alt="Perk Loop" className="h-8 w-8" />
          <span className="font-display text-lg font-bold">Perk Loop</span>
        </div>
        <Reveal>
          <AuthFlow initialRole={initialRole} initialMode={initialMode} />
        </Reveal>
        <p className="mx-auto mt-10 w-full max-w-md text-center text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <a href="#/terms" className="underline underline-offset-4 hover:text-foreground">
            Terms
          </a>{" "}
          and{" "}
          <a href="#/privacy" className="underline underline-offset-4 hover:text-foreground">
            Privacy policy
          </a>
          .
        </p>
      </main>
    </div>
  );
}
