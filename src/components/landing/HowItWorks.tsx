"use client";

import { Compass, Gift, ScanLine, ShieldCheck } from "lucide-react";
import { Reveal, SectionHead } from "./primitives";

const STEPS = [
  {
    n: "01",
    icon: Compass,
    tint: "bg-forest-soft text-forest",
    title: "Discover local businesses",
    body: "Browse cafés, salons, bakeries and more around you — each with its own loyalty program.",
  },
  {
    n: "02",
    icon: ScanLine,
    tint: "bg-lime-soft text-forest",
    title: "Scan the shop's QR",
    body: "At the counter, scan the shop's QR code. Your visit is recorded in seconds — no card to carry.",
  },
  {
    n: "03",
    icon: Gift,
    tint: "bg-marigold-soft text-sienna",
    title: "Earn & redeem, on your terms",
    body: "Balances build up for that business. Pick a reward when you're ready — the shop approves it on the spot.",
  },
];

/**
 * Cream band — the three-step loop. Cards reveal via the failure-safe
 * <Reveal> wrapper (docs/DESIGN.md §7: never pre-hide content with a
 * framer-motion initial state that can strand content invisible).
 */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
        <SectionHead
          index="01"
          eyebrow="How it works"
          title={
            <>
              Three steps. That&rsquo;s the{" "}
              <span className="marker-lime px-0.5">whole trick.</span>
            </>
          }
          sub="Perk Loop replaces torn paper stamp cards with a wallet that lives in your browser and never leaves your phone."
        />

        {/* Dashed connector behind the row — visible only in the card gaps (desktop) */}
        <div className="relative mt-12">
          <div
            aria-hidden
            className="absolute top-12 right-10 left-10 hidden border-t-[1.5px] border-dashed border-forest/15 lg:block"
          />
          <ol className="relative z-[1] grid gap-4 sm:grid-cols-3 sm:gap-5">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} as="li" delay={i * 70}>
                <article className="group relative h-full rounded-[20px] bg-card p-6 shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lift">
                  <span
                    aria-hidden
                    className="font-display absolute top-5 right-6 text-4xl leading-none font-extrabold text-forest/15 tabular-nums transition-colors duration-200 group-hover:text-forest/25"
                  >
                    {step.n}
                  </span>
                  <span
                    className={`flex size-12 items-center justify-center rounded-2xl ${step.tint}`}
                  >
                    <step.icon className="size-5" aria-hidden strokeWidth={1.5} />
                  </span>
                  <h3 className="font-display mt-4 text-[17px] font-bold tracking-[-0.01em] text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-body">{step.body}</p>
                </article>
              </Reveal>
            ))}
          </ol>
        </div>

        <Reveal
          delay={220}
          className="mt-8 flex items-center justify-center gap-2 text-center text-[13px] text-muted-foreground"
        >
          <ShieldCheck className="size-4 shrink-0 text-forest" aria-hidden strokeWidth={2} />
          <span>
            Every visit and reward is confirmed by the shop — nothing is added to
            your balance without a real check&#8209;in.
          </span>
        </Reveal>
      </div>
    </section>
  );
}
