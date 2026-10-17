"use client";

/**
 * Profile (#/app/profile) — account info (display-only: the backend exposes no
 * user-update endpoint yet), sign out, support and privacy links.
 */

import { useState } from "react";
import { Reveal, Spinner } from "@/components/customer/shared";
import { navigate } from "@/lib/hash-router";
import { useSession } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  FileText,
  HelpCircle,
  LogOut,
  Mail,
  ShieldCheck,
  Smartphone,
  Store,
} from "lucide-react";

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function LinkRow({
  icon: Icon,
  label,
  sub,
  onClick,
  href,
}: {
  icon: typeof Mail;
  label: string;
  sub?: string;
  onClick?: () => void;
  href?: string;
}) {
  const inner = (
    <>
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-semibold">{label}</span>
        {sub && <span className="block text-xs text-muted-foreground">{sub}</span>}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </>
  );
  const cls =
    "press flex w-full items-center gap-3 px-4 py-3.5 text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40";
  if (href) {
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

export function ProfileTab() {
  const { user, logout } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      toast({ title: "Signed out", description: "See you soon — your balances are safe." });
      navigate("#/");
    } catch {
      setSigningOut(false);
    }
  };

  const displayName = user?.name?.trim() || "Customer";
  const roleLabel =
    user?.role === "MERCHANT_OWNER"
      ? "Business owner"
      : user?.role === "STAFF"
        ? "Staff"
        : "Customer";

  return (
    <div className="space-y-5 px-4 pb-8 pt-5">
      <Reveal>
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
          <div
            aria-hidden
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest font-display text-2xl font-bold text-lime"
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-extrabold tracking-[-0.02em] text-ink">{displayName}</h1>
            <span className="mt-1 inline-flex items-center rounded-full bg-lime-soft px-2.5 py-0.5 text-xs font-semibold text-forest">
              {roleLabel}
            </span>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.06}>
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Account
          </h2>
          {/* Backend has no user-update endpoint yet — display-only by design, no dead edit button. */}
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {user?.phone && <InfoRow icon={Smartphone} label="Mobile" value={`+91 ${user.phone}`} />}
            {user?.email && <InfoRow icon={Mail} label="Email" value={user.email} />}
            {!user?.phone && !user?.email && (
              <p className="px-4 py-3 text-sm text-muted-foreground">No contact details on file.</p>
            )}
            <InfoRow icon={HelpCircle} label="Sign-in" value="One-time code (no password)" />
          </div>
        </section>
      </Reveal>

      <Reveal delay={0.12}>
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Support & legal
          </h2>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            <LinkRow
              icon={Mail}
              label="Email support"
              sub="support@perkloop.in — we usually reply within a day"
              href="mailto:support@perkloop.in?subject=Perk%20Loop%20support"
            />
            <LinkRow icon={HelpCircle} label="FAQ" sub="How stamps, points and rewards work" href="#/faq" />
            <LinkRow icon={ShieldCheck} label="Data & privacy" sub="What we store and why" href="#/privacy" />
            <LinkRow icon={FileText} label="Terms of use" href="#/terms" />
          </div>
        </section>
      </Reveal>

      {user?.role === "MERCHANT_OWNER" && (
        <Reveal delay={0.16}>
          <Button
            variant="outline"
            onClick={() => navigate("#/merchant")}
            className="press h-12 w-full rounded-full font-semibold"
          >
            <Store className="h-4 w-4" aria-hidden />
            Open merchant dashboard
          </Button>
        </Reveal>
      )}

      <Reveal delay={0.2}>
        <Button
          variant="outline"
          onClick={() => void signOut()}
          disabled={signingOut}
          className={cn(
            "press h-12 w-full rounded-full font-semibold text-destructive hover:text-destructive"
          )}
        >
          {signingOut ? <Spinner /> : <LogOut className="h-4 w-4" aria-hidden />}
          Sign out
        </Button>
      </Reveal>

      <Reveal delay={0.24}>
        <p className="text-center text-xs text-muted-foreground">
          Perk Loop · Shop Local. Earn Rewards. Come Back.
        </p>
      </Reveal>
    </div>
  );
}
