"use client";

import { Gift, MapPin, ShieldCheck, Store } from "lucide-react";
import { Reveal } from "./primitives";

const ITEMS = [
  {
    icon: Gift,
    tint: "bg-forest text-lime",
    title: "Rewards for every visit",
    sub: "Stamps and points on what you already buy",
  },
  {
    icon: Store,
    tint: "bg-lime text-forest",
    title: "Your local shops, remembered",
    sub: "Cafés, salons, bakeries — the places you love",
  },
  {
    icon: ShieldCheck,
    tint: "bg-marigold text-forest",
    title: "Balances never mix",
    sub: "Every business keeps its own separate balance",
  },
];

/**
 * Value-prop row on the cream band directly under the dark hero.
 * The transition dark→cream reads intentional because this band is calm
 * and structured (DESIGN.md §B — never two loud bands in a row).
 */
export function TrustStrip() {
  return (
    <section aria-label="Why Reward Jar" className="relative">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
          {ITEMS.map((item, i) => (
            <Reveal key={item.title} delay={i * 70}>
              <div className="group h-full rounded-[20px] border border-forest/8 bg-card p-5 shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lift sm:p-6">
                <span
                  className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${item.tint}`}
                >
                  <item.icon className="size-5" aria-hidden strokeWidth={1.75} />
                </span>
                <p className="font-display mt-4 text-[17px] font-bold tracking-[-0.01em] text-ink">
                  {item.title}
                </p>
                <p className="mt-1.5 text-sm leading-6 text-body">{item.sub}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal
          delay={220}
          className="mt-10 flex items-center justify-center gap-2 text-[13px] font-medium text-muted-foreground"
        >
          <MapPin className="size-4 text-sienna" aria-hidden strokeWidth={1.75} />
          Launching first in Noida &amp; Greater Noida.
        </Reveal>
      </div>
    </section>
  );
}
