"use client";

import type { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal, SectionHead } from "./primitives";

const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: "Is Perk Loop free for customers?",
    a: "Yes. Joining Perk Loop and earning stamps and points is completely free. You pay only for what you already buy at the shop — the loyalty layer costs you nothing.",
  },
  {
    q: "Do I need to download an app?",
    a: "No. Perk Loop works in your phone's browser. Scan a shop's QR code, sign in once, and your wallet is right there — no app store, no storage space.",
  },
  {
    q: "How do I earn a stamp?",
    a: "Scan the shop's Perk Loop QR code at the counter each time you visit. The shop's program then adds a stamp or points to your balance with them — confirmed by the shop, never self-reported.",
  },
  {
    q: "Can I move points between businesses?",
    a: "No — every business keeps a separate balance, and that's the point. A café's stamps can never be confused with a salon's points: what you earn at one shop stays at that shop.",
  },
  {
    q: "How does a business join?",
    a: "The owner registers on Perk Loop, shapes a program — stamp card, points, or spend-based — and prints or displays their QR code. There is no hardware to buy and no setup fee; the whole thing runs from a browser.",
  },
  {
    q: "What happens to my data?",
    a: (
      <>
        Only what the service needs: your name, an email or mobile number to
        sign in, and your visit and redemption history. We don&apos;t track
        your location and we never sell data. Read the full{" "}
        <a
          href="#/privacy"
          className="font-semibold text-primary underline underline-offset-4 transition-colors duration-150 hover:text-sienna"
        >
          Privacy Policy
        </a>
        .
      </>
    ),
  },
];

/**
 * Linen band (#F1EEE9, surface L2) — transparent accordion with warm hairline
 * separators, so the tinted band itself carries the structure.
 */
export function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 bg-secondary" aria-label="Frequently asked questions">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24">
        <SectionHead
          index="05"
          eyebrow="FAQ"
          title="Questions, answered."
          sub="Straight answers, no fine print. Anything else? Write to us at hello@perkloop.in — a human reads every message."
        />

        <Reveal delay={140} className="mt-10">
          <Accordion type="single" collapsible className="border-t border-forest/10">
            {FAQS.map((item, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border-forest/10 bg-transparent px-0"
              >
                <AccordionTrigger className="py-5 text-left text-base font-semibold font-display text-ink hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-[15px] leading-7 text-body">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
