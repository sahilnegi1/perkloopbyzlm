"use client";

/**
 * QR studio (#/merchant/qr) — two modes:
 * (a) Static outlet QR: encodes `${origin}/#/o/{code}`; print for the counter.
 * (b) Amount QR: POST /api/merchant/qr/txn → one-time QR for a purchase,
 *     TTL 5 min, single use. Countdown is honest — hits zero and stops.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, Info, Printer, QrCode, ScanLine, Wallet } from "lucide-react";
import { post, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Reveal, Spinner } from "@/components/customer/shared";
import {
  MerchantHeader,
  EmptyBlock,
  ErrorBlock,
  FieldLabel,
  FormError,
  MerchantCard,
  Micro,
  formatINR,
  type BusinessT,
} from "./shared";

type Mode = "static" | "amount";

export function QrStudioScreen({ business }: { business: BusinessT }) {
  const [mode, setMode] = useState<Mode>("static");
  const outlets = business.outlets;

  if (outlets.length === 0) {
    return (
      <div>
        <MerchantHeader eyebrow="QR studio" title="Counter codes" />
        <EmptyBlock
          icon={QrCode}
          title="No outlets yet"
          line="Add an outlet in Settings first — every QR code belongs to one physical counter."
        />
      </div>
    );
  }

  return (
    <div>
      <MerchantHeader eyebrow="QR studio" title="Counter codes" />

      {/* Mode switch — segmented pill (Wise pattern) */}
      <div className="mb-6 inline-flex rounded-full bg-secondary p-1">
        {(
          [
            { key: "static", label: "Check-in QR", icon: ScanLine },
            { key: "amount", label: "Amount QR", icon: Wallet },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={mode === t.key}
            onClick={() => setMode(t.key)}
            className={`press flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors duration-150 ${
              mode === t.key ? "bg-forest text-primary-foreground shadow-soft" : "text-body hover:text-ink"
            }`}
          >
            <t.icon className="h-4 w-4" strokeWidth={2} aria-hidden />
            {t.label}
          </button>
        ))}
      </div>

      {mode === "static" ? <StaticQrPanel business={business} /> : <AmountQrPanel business={business} />}
    </div>
  );
}

/* ─────────────────────────── Static QR ────────────────────────────── */

function StaticQrPanel({ business }: { business: BusinessT }) {
  const outlets = business.outlets;
  const [outletId, setOutletId] = useState(outlets[0]?.id ?? "");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const outlet = useMemo(() => outlets.find((o) => o.id === outletId) ?? outlets[0], [outletId, outlets]);

  useEffect(() => {
    if (!outlet?.code) return;
    const url = `${window.location.origin}/#/o/${outlet.code}`;
    let active = true;
    QRCode.toDataURL(url, {
      width: 560,
      margin: 1,
      color: { dark: "#163300", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    })
      .then((u) => {
        if (active) setDataUrl(u);
      })
      .catch(() => {
        if (active) setDataUrl(null);
      });
    return () => {
      active = false;
    };
  }, [outlet?.code]);

  if (!outlet) return null;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* The printable QR card */}
      <Reveal>
        <div className="perf-x bg-white p-5 shadow-lift">
          <div className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border-[1.5px] border-dashed border-forest/20 px-6 py-8 text-center">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-sienna">
              {business.name}
            </p>
            <p className="font-display mt-1 text-2xl font-extrabold tracking-[-0.02em] text-ink">
              Collect your stamp
            </p>
            <p className="mt-1 text-[13px] text-body">
              Scan with your phone camera — one tap, no app needed.
            </p>
            {dataUrl ? (
              <img
                src={dataUrl}
                alt={`Check-in QR code for ${outlet.name}`}
                className="mt-6 h-56 w-56 rounded-xl"
              />
            ) : (
              <div className="mt-6 flex h-56 w-56 items-center justify-center rounded-xl bg-secondary" aria-busy>
                <Spinner className="text-forest" />
              </div>
            )}
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {outlet.name}
            </p>
            <div className="mt-3 flex items-center gap-1.5 rounded-full bg-lime-soft px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-forest" aria-hidden />
              <span className="text-xs font-semibold text-forest">Every visit counts</span>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Controls */}
      <Reveal delay={0.08}>
        <div className="space-y-4">
          <MerchantCard>
            <Micro>Outlet</Micro>
            <Select value={outletId} onValueChange={setOutletId}>
              <SelectTrigger className="mt-1.5 h-11 w-full rounded-xl">
                <SelectValue placeholder="Choose outlet" />
              </SelectTrigger>
              <SelectContent>
                {outlets.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {outlet.addressLine && <p className="mt-2 text-[13px] text-body">{outlet.addressLine}</p>}

            <div className="mt-4 flex flex-col gap-2">
              <Button
                onClick={() => window.print()}
                className="press h-11 rounded-full bg-forest font-semibold text-primary-foreground hover:bg-forest/90"
              >
                <Printer className="h-4 w-4" aria-hidden /> Print this card
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (!dataUrl) return;
                  const a = document.createElement("a");
                  a.href = dataUrl;
                  a.download = `perkloop-qr-${outlet.name.replace(/\W+/g, "-").toLowerCase()}.png`;
                  a.click();
                }}
                className="press h-11 rounded-full font-semibold"
              >
                <Download className="h-4 w-4" aria-hidden /> Download PNG
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(`${window.location.origin}/#/o/${outlet.code}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                }}
                className="press h-11 rounded-full font-semibold"
              >
                {copied ? <Check className="h-4 w-4 text-forest" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                {copied ? "Link copied" : "Copy check-in link"}
              </Button>
            </div>
          </MerchantCard>

          <div className="flex items-start gap-2.5 rounded-2xl border border-forest/10 bg-secondary/60 p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-forest" strokeWidth={2} aria-hidden />
            <p className="text-[13px] leading-5 text-body">
              One stamp per customer visit, with a 30-minute cooldown between
              stamps — the server enforces it, so counters can't be double-tapped.
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

/* ─────────────────────────── Amount QR ────────────────────────────── */

function AmountQrPanel({ business }: { business: BusinessT }) {
  const outlets = business.outlets;
  const [outletId, setOutletId] = useState(outlets[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [qr, setQr] = useState<{ token: string; dataUrl: string; expiresAt: number; amountPaise: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Countdown tick (1s) while a QR is live.
  useEffect(() => {
    if (!qr) return;
    timerRef.current = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [qr]);

  const secsLeft = qr ? Math.max(0, Math.floor((qr.expiresAt - now) / 1000)) : 0;
  const expired = Boolean(qr) && secsLeft === 0;

  const create = async () => {
    setErr(null);
    const rupees = Number.parseFloat(amount);
    if (!Number.isFinite(rupees) || rupees < 10 || rupees > 100000) {
      setErr("Enter an amount between ₹10 and ₹1,00,000.");
      return;
    }
    setBusy(true);
    try {
      const res = await post<{ token: string; expiresAt: string }>("/api/merchant/qr/txn", {
        outletId,
        amountPaise: Math.round(rupees * 100),
        note: note.trim() || undefined,
      });
      const url = `${window.location.origin}/#/t/${res.token}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 560,
        margin: 1,
        color: { dark: "#163300", light: "#FFFFFF" },
        errorCorrectionLevel: "M",
      });
      setQr({ token: res.token, dataUrl, expiresAt: new Date(res.expiresAt).getTime(), amountPaise: Math.round(rupees * 100) });
      setNow(Date.now());
      setAmount("");
      setNote("");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't create the QR. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const mm = String(Math.floor(secsLeft / 60)).padStart(2, "0");
  const ss = String(secsLeft % 60).padStart(2, "0");

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* Live QR display */}
      <Reveal>
        <div className="relative overflow-hidden rounded-[24px] bg-forest p-6 shadow-lift grain-dark">
          <div aria-hidden className="dot-grid-dark absolute inset-0" />
          <div className="relative flex min-h-[380px] flex-col items-center justify-center text-center">
            {!qr ? (
              <>
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/8 ring-1 ring-white/15">
                  <Wallet className="h-9 w-9 text-lime" strokeWidth={1.5} aria-hidden />
                </div>
                <p className="font-display mt-5 text-xl font-extrabold text-[#FAF7F2]">
                  Create a one-time payment QR
                </p>
                <p className="mt-2 max-w-[38ch] text-sm leading-6 text-white/65">
                  Enter the bill amount, show the code — your customer scans,
                  confirms, and points land in their wallet.
                </p>
              </>
            ) : (
              <>
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-white/55">
                  Show this to your customer
                </p>
                <img src={qr.dataUrl} alt="One-time payment QR code" className="mt-4 h-56 w-56 rounded-xl bg-white p-2" />
                <p className="font-display mt-4 text-[2rem] leading-none font-extrabold text-lime tabular-nums">
                  {formatINR(qr.amountPaise)}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`inline-flex h-8 items-center rounded-full px-3 font-mono text-[13px] font-bold tabular-nums ${
                      expired ? "bg-white/10 text-white/60" : "bg-white/12 text-[#FAF7F2]"
                    }`}
                  >
                    {expired ? "EXPIRED" : `${mm}:${ss}`}
                  </span>
                  <span className="text-xs text-white/60">single use · this exact code</span>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setQr(null)}
                  className="press mt-5 h-10 rounded-full border-white/25 bg-transparent px-5 text-sm font-semibold text-[#FAF7F2] hover:bg-white/10"
                >
                  {expired ? "Create a new code" : "Create another"}
                </Button>
              </>
            )}
          </div>
        </div>
      </Reveal>

      {/* Form */}
      <Reveal delay={0.08}>
        <div className="space-y-4">
          <MerchantCard>
            <div className="space-y-4">
              <div>
                <FieldLabel htmlFor="qr-outlet">Outlet</FieldLabel>
                <Select value={outletId} onValueChange={setOutletId}>
                  <SelectTrigger id="qr-outlet" className="h-11 w-full rounded-xl">
                    <SelectValue placeholder="Choose outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    {outlets.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor="qr-amount">Bill amount (₹)</FieldLabel>
                <Input
                  id="qr-amount"
                  inputMode="decimal"
                  className="h-12 rounded-xl text-lg font-bold tabular-nums"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="250"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">₹10 – ₹1,00,000 · the customer confirms before points move.</p>
              </div>
              <div>
                <FieldLabel htmlFor="qr-note">Note (optional)</FieldLabel>
                <Input
                  id="qr-note"
                  className="h-11 rounded-xl"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={80}
                  placeholder="Table 4 · two coffees"
                />
              </div>
              <FormError message={err} />
              <Button
                onClick={() => void create()}
                disabled={busy}
                className="press h-12 w-full rounded-full bg-forest text-base font-semibold text-primary-foreground hover:bg-forest/90"
              >
                {busy ? <Spinner /> : <QrCode className="h-4 w-4" aria-hidden />} Generate QR
              </Button>
            </div>
          </MerchantCard>

          {qr && !expired && (
            <div className="flex items-center justify-between rounded-2xl border border-forest/10 bg-secondary/60 p-4">
              <p className="text-[13px] text-body">Shareable link (same QR):</p>
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-full px-3 text-[13px] font-semibold"
                onClick={() => {
                  void navigator.clipboard.writeText(`${window.location.origin}/#/t/${qr.token}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                }}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-forest" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          )}

          <div className="flex items-start gap-2.5 rounded-2xl border border-forest/10 bg-secondary/60 p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-forest" strokeWidth={2} aria-hidden />
            <p className="text-[13px] leading-5 text-body">
              Each code works once and expires in 5 minutes. Replay, expiry and
              double-scans are rejected by the server — no trust needed.
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
