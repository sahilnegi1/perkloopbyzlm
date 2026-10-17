"use client";

/**
 * Scan (#/app/scan) — honest screen: the camera belongs to the phone's native
 * QR flow; here we offer a paste-a-code fallback that parses outlet codes,
 * txn tokens and full Perk Loop URLs.
 */

import { useState } from "react";
import { EmptyState, ErrorState, Reveal, Spinner } from "@/components/customer/shared";
import { navigate } from "@/lib/hash-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ArrowRight, Camera, ClipboardPaste, ScanLine, TriangleAlert } from "lucide-react";

type Parsed =
  | { kind: "outlet"; code: string; href: string }
  | { kind: "txn"; token: string; href: string };

/** Extract an outlet code or txn token from raw text (URL, code, or token). */
export function parsePerkCode(raw: string): Parsed | null {
  const value = raw.trim();
  if (!value) return null;

  // Full URLs first: ...#/o/{code} or ...#/t/{token}
  const tMatch = value.match(/#\/t\/([A-Za-z0-9_-]+)/);
  if (tMatch) return { kind: "txn", token: tMatch[1], href: `#/t/${tMatch[1]}` };
  const oMatch = value.match(/#\/o\/([^/?#\s]+)/);
  if (oMatch) return { kind: "outlet", code: oMatch[1], href: `#/o/${oMatch[1]}` };

  // Bare one-time txn token: 32-byte base64url (43 chars, URL-safe alphabet).
  if (/^[A-Za-z0-9_-]{30,}$/.test(value)) {
    return { kind: "txn", token: value, href: `#/t/${value}` };
  }
  // Bare outlet code (Prisma cuid — 24-25 lowercase alphanumeric chars).
  const bare = value.replace(/^@/, "");
  if (/^[A-Za-z0-9]{8,29}$/.test(bare)) {
    return { kind: "outlet", code: bare, href: `#/o/${bare}` };
  }
  return null;
}

export function ScanTab() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = () => {
    const parsed = parsePerkCode(value);
    if (!parsed) {
      setError("That doesn't look like a Perk Loop code. Paste the shop's outlet code, a payment code, or the full link.");
      return;
    }
    setError(null);
    setBusy(true);
    navigate(parsed.href);
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setValue(text);
        setError(null);
      }
    } catch {
      setError("Your browser blocked clipboard access — paste into the box manually.");
    }
  };

  return (
    <div className="space-y-6 px-4 pb-8 pt-5">
      <Reveal>
        <div className="space-y-1.5">
          <h1 className="font-display text-[1.75rem] font-extrabold tracking-[-0.02em] text-ink">Scan</h1>
          <p className="text-sm text-muted-foreground">
            Collect stamps and points when you're at the shop.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.06}>
        <div className="rounded-2xl bg-forest p-5 text-primary-foreground shadow-[0_12px_32px_rgba(26,29,22,0.12)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <Camera className="h-6 w-6 text-lime" aria-hidden />
          </div>
          <h2 className="mt-3 font-display text-lg font-extrabold tracking-[-0.01em] text-ink">Scan with your phone's camera</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-primary-foreground/75">
            Point your phone camera at the Perk Loop QR code at the counter. The link opens
            automatically — your stamp or payment confirmation happens right there. Browsers don't
            give this page camera access, so we won't pretend to scan here.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.12}>
        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-base font-bold">Have a code? Paste it</h2>
          <p className="text-sm text-muted-foreground">
            Works with a shop's outlet code, a one-time payment code, or a full
            <span className="font-mono text-xs"> /#/o/… </span>or
            <span className="font-mono text-xs"> /#/t/… </span>
            link someone shared.
          </p>
          <div className="flex gap-2">
            <Input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !busy) go();
              }}
              placeholder="e.g. cmvx…  ·  a payment code  ·  full URL"
              aria-label="Perk Loop code"
              className={cn("h-12 rounded-xl font-mono text-sm", error && "border-destructive")}
              aria-invalid={Boolean(error)}
            />
            <Button
              variant="outline"
              onClick={() => void pasteFromClipboard()}
              aria-label="Paste from clipboard"
              className="press h-12 w-12 shrink-0 rounded-xl p-0"
            >
              <ClipboardPaste className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          {error && (
            <p className="flex items-start gap-1.5 text-sm font-medium text-destructive" role="alert">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}
          <Button
            onClick={go}
            disabled={busy || value.trim().length === 0}
            className="press h-12 w-full rounded-full text-base font-semibold"
          >
            {busy ? <Spinner /> : <ScanLine className="h-4 w-4" aria-hidden />}
            Open this code
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </Reveal>

      <Reveal delay={0.18}>
        <EmptyState
          icon={ScanLine}
          title="Where's the QR code?"
          line="Every participating shop keeps a Perk Loop QR at the counter — ask at the till if you can't spot it."
        />
      </Reveal>
    </div>
  );
}
