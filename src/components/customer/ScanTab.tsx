"use client";

/**
 * Scan (#/app/scan) — primary action decodes a QR from the camera (a photo of
 * the counter code). Decoding: native BarcodeDetector when the browser has it,
 * jsQR everywhere else (notably iPhone Safari, which has no BarcodeDetector).
 * Includes a 90°-rotation retry so counter photos taken at odd angles decode.
 * Manual code entry stays as a compact universal fallback.
 */

import { useRef, useState } from "react";
import jsQR from "jsqr";
import { EmptyState, Reveal, Spinner } from "@/components/customer/shared";
import { navigate } from "@/lib/hash-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ArrowRight, ScanLine, TriangleAlert } from "lucide-react";

type Parsed =
  | { kind: "outlet"; code: string; href: string }
  | { kind: "txn"; token: string; href: string };

/** Extract an outlet code or txn token from raw text (URL, code, or token). */
export function parseRewardCode(raw: string): Parsed | null {
  const value = raw.trim();
  if (!value) return null;

  // Full URLs first: ...#/t/{token} or ...#/o/{code}
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

/** Back-compat alias (older imports may still use the previous name). */
export const parsePerkCode = parseRewardCode;

const hasBarcodeDetector = () =>
  typeof window !== "undefined" && "BarcodeDetector" in window;

/**
 * Decode a QR payload from an image file. Order:
 *   1. Native BarcodeDetector (Chromium — fastest, handles perspective well).
 *   2. jsQR over canvas ImageData, retrying at 0°/90°/270°/180° (pure JS —
 *      works on iPhone Safari and every other browser).
 * Returns null when nothing decodable is found.
 */
async function decodeQrFromFile(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);

  // 1) Native detector first when available.
  if (hasBarcodeDetector()) {
    try {
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      const hits = await detector.detect(bitmap);
      if (hits.length > 0 && hits[0].rawValue) {
        bitmap.close?.();
        return hits[0].rawValue;
      }
    } catch {
      /* fall through to jsQR */
    }
  }

  // 2) jsQR across rotations. Long edge capped at 1280px for speed.
  const MAX_EDGE = 1280;
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    bitmap.close?.();
    return null;
  }

  const rotations = [0, 90, 270, 180];
  try {
    for (const deg of rotations) {
      ctx.save();
      if (deg === 0) {
        ctx.drawImage(bitmap, 0, 0, w, h);
      } else {
        canvas.width = h;
        canvas.height = w;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((deg * Math.PI) / 180);
        ctx.drawImage(bitmap, -w / 2, -h / 2, w, h);
      }
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const found = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
      ctx.restore();
      if (found?.data) return found.data;
    }
  } finally {
    bitmap.close?.();
  }
  return null;
}

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
    setScanning(true);
    try {
      const raw = await decodeQrFromFile(file);
      if (!raw) {
        setError(
          "No QR code found in that photo. Move closer, fill the frame with the code, and try again — or enter the code below."
        );
        return;
      }
      if (!openParsed(raw)) {
        // Decoded something, but it isn't a Reward Jar payload — let the user see/edit it.
        setValue(raw);
        setError("Found a code, but it isn't a Reward Jar QR. Check the text below or enter the shop's code.");
      }
    } catch {
      setError("Couldn't read that photo. Try again in better light — or enter the code below.");
    } finally {
      setScanning(false);
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

      {/* Primary action — scan the counter QR (camera or gallery) */}
      <Reveal delay={0.06}>
        <div className="rounded-2xl bg-forest p-5 text-primary-foreground shadow-[0_12px_32px_rgba(26,29,22,0.12)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <ScanLine className="h-6 w-6 text-lime" aria-hidden />
          </div>
          <h2 className="mt-3 font-display text-lg font-extrabold tracking-[-0.01em] text-primary-foreground">
            Scan the counter QR
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-primary-foreground/75">
            Point your camera at the shop's Reward Jar QR code — we read it right
            on your phone. No app download, nothing to install.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            aria-label="Scan the QR code with your camera"
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
            {scanning ? <Spinner /> : <ScanLine className="h-4 w-4" aria-hidden />}
            {scanning ? "Reading the code…" : "Scan QR"}
          </Button>
        </div>
      </Reveal>

      {/* Compact universal fallback — enter any code or link */}
      <Reveal delay={0.12}>
        <div className="space-y-2.5 rounded-2xl border border-border bg-card p-4">
          <p className="text-[13px] font-semibold text-ink">
            Have a code instead?
          </p>
          <p className="text-xs leading-5 text-muted-foreground">
            Enter the shop's outlet code, a one-time payment code, or the full link they shared.
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
              placeholder="Outlet code or link"
              aria-label="Reward Jar code"
              className={cn("h-11 rounded-xl font-mono text-sm", error && "border-destructive")}
              aria-invalid={Boolean(error)}
            />
            <Button
              onClick={go}
              disabled={busy || value.trim().length === 0}
              aria-label="Open this code"
              className="press h-11 w-11 shrink-0 rounded-xl p-0"
            >
              {busy ? <Spinner /> : <ArrowRight className="h-4 w-4" aria-hidden />}
            </Button>
          </div>
          {error && (
            <p className="flex items-start gap-1.5 text-xs font-medium text-destructive" role="alert">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {error}
            </p>
          )}
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
