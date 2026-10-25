"use client";

import { ArrowRight, Check, QrCode, Wallet } from "lucide-react";
import { CornerBrackets, PillCta, Reveal, SectionHead, onAnchorClick } from "./primitives";

const PITCH_POINTS = [
  "Static QR for walk-in stamps",
  "One-time amount QR for purchases",
  "You approve every redemption",
];

/**
 * The merchant pitch on cream. Right side: a rich, clearly-labelled product
 * illustration of the merchant dashboard (Ramp-spec dark shell, KPI ticker,
 * white approval module) — same illustration discipline as PhoneMockup.
 */
export function ForBusiness() {
  return (
    <section id="for-business" className="scroll-mt-24 overflow-x-clip">
      {/* overflow-x-clip: the floating "No setup fee" chip and the fixed-width
          dashboard illustration must never widen the document on 320–360px
          screens (audit: landing horizontal overflow). */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          {/* ——— Copy ——— */}
          <div className="max-w-xl">
            <SectionHead
              align="left"
              index="03"
              eyebrow="For business owners"
              title="A loyalty program that runs itself."
              sub="No paper cards to print, no POS hardware to install. Set up your program once in the browser, keep your QR at the counter, and Reward Jar records every visit — with you approving every reward."
            />

            <Reveal delay={160}>
              <ul className="mt-7 space-y-3.5">
                {PITCH_POINTS.map((point) => (
                  <li key={point} className="flex items-center gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-lime-soft">
                      <Check className="size-3.5 text-forest" aria-hidden strokeWidth={2.5} />
                    </span>
                    <span className="text-[15px] font-medium text-ink">{point}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal
              delay={220}
              className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-7"
            >
              <PillCta href="#/auth?role=merchant&mode=register" variant="forest">
                Register your business
              </PillCta>
              <a
                href="#faq"
                onClick={onAnchorClick("faq")}
                className="press group inline-flex h-12 items-center gap-1.5 text-sm font-semibold text-forest underline decoration-forest/30 underline-offset-8 transition-colors duration-150 outline-none hover:decoration-forest focus-visible:rounded-full focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                See how programs work
                <ArrowRight
                  className="size-4 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden
                  strokeWidth={2.25}
                />
              </a>
            </Reveal>
          </div>

          {/* ——— Merchant dashboard illustration ——— */}
          <Reveal delay={120}>
            <figure
              aria-label="Product illustration of the Reward Jar merchant dashboard"
              className="relative mx-auto w-full max-w-[520px] lg:max-w-none"
            >
              <div className="relative rounded-[24px] bg-[#10240F] p-5 shadow-lift grain-dark sm:p-6">
                <CornerBrackets />

                {/* floating warmth chip — stays inside the card on phones,
                    hangs off the edge only where there's room */}
                <span className="absolute -top-5 right-2 rotate-3 rounded-full bg-marigold px-3.5 py-1.5 text-xs font-bold text-forest shadow-lift sm:-top-6 sm:-right-4">
                  No setup fee
                </span>

                {/* shell header */}
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] font-medium tracking-[0.14em] text-white/50 uppercase">
                      Merchant dashboard
                    </p>
                    <p className="font-display mt-1 text-sm font-bold text-[#FAF7F2]">
                      Café A · Sector 18, Noida
                    </p>
                  </div>
                  <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[#FAF7F2]/80">
                    Illustration
                  </span>
                </div>

                {/* KPI ticker strip — lime only where money moves */}
                <dl className="relative mt-5 grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/10 bg-white/[0.04]">
                  {[
                    { label: "Today's visits", value: "6", accent: false },
                    { label: "Points issued", value: "240", accent: true },
                    { label: "Pending approvals", value: "1", accent: false },
                  ].map((kpi) => (
                    <div key={kpi.label} className="px-3 py-3.5 first:pl-4 last:pr-4">
                      <dt className="font-mono text-[11px] font-medium tracking-[0.1em] text-white/50 uppercase">
                        {kpi.label}
                      </dt>
                      <dd
                        className={`font-display mt-1 text-xl leading-none font-extrabold tabular-nums ${
                          kpi.accent ? "text-lime" : "text-[#FAF7F2]"
                        }`}
                      >
                        {kpi.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* white inset module — a live redemption request */}
                <div className="relative mt-4 rounded-xl bg-white p-3.5 shadow-soft">
                  <div className="flex items-center gap-3">
                    <span className="font-display flex size-8 shrink-0 items-center justify-center rounded-full bg-marigold-soft text-xs font-extrabold text-sienna">
                      P
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-4 font-semibold text-ink">
                        Free coffee — Redeem request
                      </p>
                      <p className="mt-0.5 text-[11px] text-fg-tertiary">120 pts · Priya S.</p>
                    </div>
                    <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-lime px-3.5 text-xs font-bold text-forest">
                      <Check className="size-3.5" aria-hidden strokeWidth={2.5} />
                      Approve
                    </span>
                  </div>
                </div>

                {/* program settings row */}
                <div className="relative mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3.5 py-3">
                  <p className="flex min-w-0 items-center gap-2 text-xs text-[#FAF7F2]/75">
                    <QrCode className="size-4 shrink-0 text-[#FAF7F2]/65" aria-hidden strokeWidth={1.5} />
                    <span className="truncate">
                      Stamp card · 1 per visit · Cooldown 30 min
                    </span>
                  </p>
                  <span aria-hidden className="relative inline-flex h-5 w-9 shrink-0 rounded-full bg-lime">
                    <span className="absolute top-0.5 right-0.5 size-4 rounded-full bg-[#0F2A00]" />
                  </span>
                </div>

                {/* counter hint */}
                <p className="relative mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[#FAF7F2]/65">
                  <Wallet className="size-3.5" aria-hidden strokeWidth={1.75} />
                  Works from any browser — nothing to install at the counter.
                </p>
              </div>
            </figure>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
