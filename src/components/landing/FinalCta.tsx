"use client";

import { ArrowRight, Gift } from "lucide-react";
import { CircularBadge, PillCta, Reveal } from "./primitives";

/**
 * Cream band holding the page's ONE big Dark Section Card (Wise pattern):
 * forest-hero layered background, grain, dotted grid, lime CTA — the last
 * beat of the scroll before the dark footer.
 */
export function FinalCta() {
  return (
    <section aria-labelledby="final-cta-title">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
        <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-forest-hero px-6 py-16 text-center shadow-lift grain-dark sm:px-12 md:p-16">
          {/* dotted grid field */}
          <div aria-hidden className="dot-grid-dark absolute inset-0" />

          <CircularBadge
            text="EARN • REDEEM • REPEAT • "
            icon={<Gift className="size-5" aria-hidden strokeWidth={1.75} />}
            className="absolute -top-8 -right-8 hidden text-[#FAF7F2]/60 md:flex"
          />

          <div className="relative">
            <h2
              id="final-cta-title"
              className="font-display mx-auto max-w-3xl text-[2.5rem] leading-[1.05] font-extrabold tracking-[-0.03em] text-[#FAF7F2] sm:text-[3rem] lg:text-[3.75rem]"
            >
              Shop local. Earn rewards.{" "}
              <span className="marker-marigold-dark px-0.5">Come back.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-7 text-[#FAF7F2]/75 sm:text-[17px]">
              Your trust matters. Your loyalty matters. And you matter.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
              <PillCta href="#/auth?role=customer" variant="lime" className="sm:px-8">
                Join as a Customer
                <ArrowRight
                  className="size-4 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden
                  strokeWidth={2.5}
                />
              </PillCta>
              <PillCta
                href="#/auth?role=merchant&mode=register"
                variant="ghost-on-dark"
                className="h-auto px-0 text-[15px]"
              >
                Register your business
              </PillCta>
            </div>

            <p className="mt-8 text-[13px] leading-6 font-medium text-[#FAF7F2]/65">
              Free for customers · Free for businesses during the Noida pilot — we'll announce pricing before we ever charge anyone.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
