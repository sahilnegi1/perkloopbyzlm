"use client";

import { ScanLine, Smartphone, TrendingUp } from "lucide-react";
import { PhoneMockup } from "./PhoneMockup";
import { Reveal, SectionHead } from "./primitives";

const WEEK_BARS = [40, 65, 50, 80, 58, 90, 72];
const WEEK_DAYS = ["M", "T", "W", "T", "F", "S", "S"];

function Caption({ label }: { label: string }) {
  return (
    <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
      <ScanLine className="size-3.5" aria-hidden strokeWidth={2} />
      {label}
    </p>
  );
}

/**
 * Cream band — the "two views" showcase: the real customer wallet illustration
 * beside a merchant dashboard view, framed as equal-weight device cards.
 * Everything is a labelled illustration; no fabricated live claims.
 */
export function FeaturePreviews() {
  return (
    <section aria-label="Product previews">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
        <SectionHead
          index="04"
          eyebrow="Product previews"
          title="Two views, one honest loop"
          sub="What customers see, and what shops see — kept in sync, with every balance and approval out in the open."
        />

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2">
          {/* ——— Customer wallet ——— */}
          <Reveal>
            <article className="flex h-full flex-col rounded-[24px] bg-card p-4 shadow-lift sm:p-5">
              <div className="flex flex-1 items-center justify-center rounded-[20px] bg-secondary/70 p-6 sm:p-8">
                <PhoneMockup />
              </div>
              <div className="mt-4 flex items-center justify-between px-2 pb-1">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                  <Smartphone className="size-4 text-forest" aria-hidden strokeWidth={2} />
                  Customer wallet
                </p>
                <span className="font-mono text-[11px] font-medium tracking-[0.12em] text-fg-tertiary uppercase">
                  Illustration
                </span>
              </div>
              <Caption label="A look inside — balances, stamp cards and rewards per shop." />
            </article>
          </Reveal>

          {/* ——— Merchant dashboard ——— */}
          <Reveal delay={70}>
            <article className="flex h-full flex-col rounded-[24px] bg-card p-4 shadow-lift sm:p-5">
              <div className="flex flex-1 flex-col justify-center rounded-[20px] bg-secondary/70 p-6 sm:p-8">
                {/* mini dashboard module */}
                <div className="rounded-2xl border border-forest/8 bg-white p-5 shadow-soft">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[11px] font-medium tracking-[0.12em] text-fg-tertiary uppercase">
                      Visits this week
                    </p>
                    <p className="font-mono text-[11px] font-medium tracking-[0.12em] text-fg-tertiary uppercase">
                      Café A
                    </p>
                  </div>

                  {/* mini bar chart — today in lime */}
                  <div className="mt-4 flex h-28 items-end gap-2" aria-hidden>
                    {WEEK_BARS.map((h, i) => (
                      <div key={i} className="flex h-full flex-1 flex-col justify-end">
                        <span
                          className={`w-full rounded-full ${
                            i === WEEK_BARS.length - 1 ? "bg-lime" : "bg-forest"
                          }`}
                          style={{ height: `${h}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2" aria-hidden>
                    {WEEK_DAYS.map((d, i) => (
                      <span
                        key={i}
                        className={`flex-1 text-center font-mono text-[11px] font-medium ${
                          i === WEEK_DAYS.length - 1 ? "text-forest" : "text-ink/40"
                        }`}
                      >
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* recent activity */}
                  <ul className="mt-4 divide-y divide-forest/8 border-t border-forest/8 pt-1">
                    <li className="flex items-center gap-2.5 py-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-forest-soft font-mono text-[11px] font-bold text-forest">
                        +1
                      </span>
                      <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">
                        Stamp · walk-in visit
                      </p>
                      <p className="text-[12px] font-semibold text-forest tabular-nums">Today</p>
                    </li>
                    <li className="flex items-center gap-2.5 py-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-marigold-soft font-mono text-[11px] font-bold text-sienna">
                        −
                      </span>
                      <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">
                        Free coffee · approved
                      </p>
                      <p className="text-[12px] font-semibold text-ink/60 tabular-nums">−120 pts</p>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between px-2 pb-1">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                  <TrendingUp className="size-4 text-forest" aria-hidden strokeWidth={2} />
                  Merchant dashboard
                </p>
                <span className="font-mono text-[11px] font-medium tracking-[0.12em] text-fg-tertiary uppercase">
                  Illustration
                </span>
              </div>
              <Caption label="Visits, redemptions and approvals — counted from your own counter." />
            </article>
          </Reveal>
        </div>

        <Reveal
          delay={140}
          className="mx-auto mt-8 max-w-2xl text-center text-[13px] leading-6 text-muted-foreground"
        >
          Sample screens with placeholder names — your wallet starts empty and
          fills with the shops you actually visit.
        </Reveal>
      </div>
    </section>
  );
}
