"use client";

import { ScanLine, Star } from "lucide-react";
import { Logo, StampRow } from "./primitives";

/**
 * Pure CSS/JSX product illustration of the customer wallet — a phone frame
 * carrying the real brand system: forest balance card, perforated stamp card,
 * points row. Clearly an illustration (captioned), never a live account.
 */
export function PhoneMockup() {
  return (
    <figure
      aria-label="Product illustration of the Reward Jar customer wallet"
      className="relative w-fit"
    >
      <div className="relative w-[270px] rounded-[2.75rem] border border-white/15 bg-[#0B2400] p-[10px] shadow-lift sm:w-[300px]">
        <div className="relative overflow-hidden rounded-[2.25rem] bg-[#FAF7F2]">
          {/* status bar */}
          <div className="flex items-center justify-between px-6 pt-3">
            <span className="font-mono text-[10px] font-semibold text-ink/70 tabular-nums">9:41</span>
            <div aria-hidden className="h-5 w-20 rounded-full bg-[#0B2400]" />
            <span className="font-mono text-[10px] font-semibold text-ink/70 tabular-nums">100%</span>
          </div>

          <div className="flex h-[490px] flex-col px-4 pt-3 pb-4 sm:h-[530px]">
            {/* wallet header */}
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="font-mono text-[9px] font-medium tracking-[0.14em] text-ink/50 uppercase">
                  Your wallet
                </p>
                <p className="font-display text-base leading-tight font-bold text-ink">Noida</p>
              </div>
              <span className="flex size-8 items-center justify-center rounded-full border border-forest/10 bg-white shadow-soft">
                <Logo className="h-5 w-5" />
              </span>
            </div>

            {/* forest balance card — the Wise Dark Section Card pattern */}
            <div className="relative mt-3 overflow-hidden rounded-[20px] bg-forest p-4 shadow-card">
              <div
                aria-hidden
                className="absolute -top-10 -right-8 size-28 rounded-full bg-lime/20 blur-2xl"
              />
              <p className="font-mono text-[9px] font-medium tracking-[0.14em] text-white/50 uppercase">
                Points balance
              </p>
              <p className="font-display mt-1 text-[1.7rem] leading-none font-extrabold text-lime tabular-nums">
                1,240
              </p>
              <p className="mt-1 text-[11px] font-medium text-white/70">Café A · Khan Market</p>

              {/* inset white action module */}
              <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2.5 shadow-soft">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-marigold-soft">
                    <Star className="size-3 text-marigold" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="text-[11px] font-semibold text-ink">Free coffee</span>
                </div>
                <span className="rounded-full bg-lime px-2.5 py-1 text-[10px] font-bold text-forest">
                  120 pts
                </span>
              </div>
            </div>

            {/* perforated stamp card — the signature object */}
            <div className="perf-x mt-3.5 bg-white px-4 py-3 shadow-card">
              <div className="rounded-lg border-[1.5px] border-dashed border-forest/20 px-2 py-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-ink">Café A</p>
                  <p className="font-mono text-[9px] font-medium tracking-[0.1em] text-ink/45 uppercase">
                    4 of 5
                  </p>
                </div>
                <StampRow value={4} total={5} size={24} className="mt-2.5" />
                <p className="mt-2.5 text-[10px] leading-4 font-medium text-ink/55">
                  One more visit for a free coffee
                </p>
              </div>
            </div>

            {/* second business — points row */}
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-forest/8 bg-white p-3 shadow-soft">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-lime-soft font-display text-[13px] font-extrabold text-forest">
                S
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] leading-4 font-semibold text-ink">Salon B</p>
                <p className="font-mono text-[9px] tracking-[0.08em] text-ink/45 uppercase">
                  Separate balance
                </p>
              </div>
              <span className="font-display text-sm font-extrabold text-sienna tabular-nums">310</span>
            </div>

            {/* scan hint */}
            <div className="mt-auto flex items-center justify-center gap-1.5 pt-3">
              <ScanLine className="size-3 text-ink/40" strokeWidth={2} aria-hidden />
              <p className="text-[9px] font-medium text-ink/40">Scan at the counter to earn</p>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
