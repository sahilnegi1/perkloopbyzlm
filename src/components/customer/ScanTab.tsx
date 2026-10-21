"use client";

/**
 * Scan (#/app/scan) — the tab that scans. Primary action decodes a QR from a
 * photo (BarcodeDetector + native camera capture — no getUserMedia needed).
 * Paste-a-code stays as the universal fallback; unsupported browsers get an
 * honest message, never a fake scanner.
 */

import { useRef, useState } from "react";
import { EmptyState, Reveal, Spinner } from "@/components/customer/shared";
import { navigate } from "@/lib/hash-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ArrowRight, Camera, ClipboardPaste, ImageUp, ScanLine, TriangleAlert } from "lucide-react";

type Parsed =
  | { kind: "outlet"; code: string; href: string }
  | { kind: "txn"; token: string; href: string };

/** Extract an outlet code or txn token from raw text (URL, code, or token). */
export function parseRewardCode(raw: string): Parsed | null {
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

const barcodeSupported = () =>
  typeof window !== "undefined" && "BarcodeDetector" in window;

export function ScanTab() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const go = () => {
    const parsed = parseRewardCode(value);
    if (!parsed) {
      setError("That doesn't look like a Reward Jar code. Paste the shop's outlet code, a payment code, or the full link.");
      return;
    }
    setError(null);
    setBusy(true);
    navigate(parsed.href);
  };

  const openParsed = (raw: string): boolean => {
    const parsed = parseRewardCode(raw);
    if (!parsed) return false;
    navigate(parsed.href);
    return true;
  };

  /** Decode a QR from a photo taken at the counter (UX-01). */
  const scanPhoto = async (file: File) => {
    setError(null);
    if (!barcodeSupported()) {
      setError("This browser can't scan photos — take a photo and use the shop's link below instead, or paste the code.");
      return;
    }
    setScanning(true);
    try {
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      const bitmap = await createImageBitmap(file);
      const hits = await detector.detect(bitmap);
      bitmap.close?.();
      if (hits.length === 0) {
        setError("No QR code found in that photo. Move closer, fill the frame, and try again — or paste the code below.");
        return;
      }
      if (!openParsed(hits[0].rawValue)) {
        // Decoded something, but it isn't a Reward Jar payload — let the user see/edit it.
        setValue(hits[0].rawValue);
        setError("Found a code, but it isn't a Reward Jar QR. Check the text below or paste the shop's code.");
      }
    } catch {
      setError("Couldn't read that photo. Try again in better light — or paste the code below.");
    } finally {
      setScanning(false);
    }
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

      {/* Primary action — scan a photo of the counter QR */}
      <Reveal delay={0.06}>
        <div className="rounded-2xl bg-forest p-5 text-primary-foreground shadow-[0_12px_32px_rgba(26,29,22,0.12)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <Camera className="h-6 w-6 text-lime" aria-hidden />
          </div>
          <h2 className="mt-3 font-display text-lg font-extrabold tracking-[-0.01em] text-primary-foreground">
            Scan the counter QR
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-primary-foreground/75">
            Take a photo of the shop's Reward Jar QR code — we read it right on your
            phone. No app download, nothing to install.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            aria-label="Take a photo of the QR code"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void scanPhoto(f);
              e.target.value = ""; // allow retaking the same photo
            }}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={scanning}
            className="press mt-4 h-12 w-full rounded-full bg-lime text-base font-semibold text-forest hover:bg-lime/90"
          >
            {scanning ? <Spinner /> : <ImageUp className="h-4 w-4" aria-hidden />}
            {scanning ? "Reading the code…" : "Scan a photo of the code"}
          </Button>
        </div>
      </Reveal>

      {/* Universal fallback — paste any code or link */}
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
              aria-label="Reward Jar code"
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
          line="Every participating shop keeps a Reward Jar QR at the counter — ask at the till if you can't spot it."
        />
      </Reveal>
    </div>
  );
}
