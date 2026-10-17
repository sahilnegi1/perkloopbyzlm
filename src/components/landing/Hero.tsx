"use client";

import { motion, useReducedMotion, useScroll, useTransform, type Variants } from "framer-motion";
import { ArrowRight, Gift, ScanLine, ShieldCheck, Sparkles } from "lucide-react";
import { EASE_HERO, PillCta } from "./primitives";
import { PhoneMockup } from "./PhoneMockup";

const HERO_WORDS: { text: string; accent?: boolean }[][] = [
  [{ text: "Your" }, { text: "trust" }, { text: "matters." }],
  [{ text: "Your" }, { text: "loyalty", accent: true }, { text: "matters." }],
  [{ text: "And" }, { text: "you" }, { text: "matter.", accent: true }],
];

const CHIPS = [
  { icon: ScanLine, label: "Stamp earned at the counter", pos: "-left-6 top-24 lg:-left-14", speed: -46, delay: 1.0 },
  { icon: Gift, label: "Free coffee · 120 pts", pos: "-right-4 top-56 lg:-right-12", speed: -24, delay: 1.15 },
  { icon: ShieldCheck, label: "Balances never mix between shops", pos: "-left-3 bottom-16 lg:-left-12", speed: -34, delay: 1.3 },
];

export function Hero() {
  const reduce = useReducedMotion();

  // 3 parallax planes over ~900px scroll — adjacent rates differ ~15-30%.
  const { scrollY } = useScroll();
  const yFar = useTransform(scrollY, [0, 900], [0, reduce ? 0 : -60]);
  const yMid = useTransform(scrollY, [0, 900], [0, reduce ? 0 : -110]);
  const yDevice = useTransform(scrollY, [0, 900], [0, reduce ? 0 : -160]);

  // Word-by-word hero headline — one kinetic moment (design law: one per act).
  const wordVariants: Variants = reduce
    ? {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 0.4, ease: "linear" } },
      }
    : {
        hidden: { y: "115%" },
        show: { y: "0%", transition: { duration: 0.8, ease: EASE_HERO } },
      };

  const wordsContainer: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
  };

  const fadeUp = (delay: number): Variants =>
    reduce
      ? {
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { duration: 0.3, delay, ease: "linear" } },
        }
      : {
          hidden: { opacity: 0, y: 16 },
          show: { opacity: 1, y: 0, transition: { duration: 0.7, delay, ease: EASE_HERO } },
        };

  const chipIn = (delay: number): Variants =>
    reduce
      ? {
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { duration: 0.3, delay, ease: "linear" } },
        }
      : {
          hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
          show: {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            transition: { duration: 0.7, delay, ease: EASE_HERO },
          },
        };

  return (
    <section
      aria-labelledby="hero-title"
      className="bg-forest-hero grain-dark relative overflow-hidden"
    >
      {/* dotted grid field, masked to the upper canvas */}
      <div aria-hidden className="dot-grid-dark absolute inset-0" />

      {/* far plane — soft tint bloom */}
      <motion.div
        style={{ y: yFar }}
        aria-hidden
        className="pointer-events-none absolute top-1/3 -left-32 h-80 w-80 rounded-full bg-[#9FE870]/10 blur-3xl"
      />
      <motion.div
        style={{ y: yFar }}
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[10%] h-72 w-72 rounded-full bg-[#F59E0B]/10 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pt-24 lg:pb-28">
        {/* ——— Copy ——— */}
        <div className="max-w-2xl">
          <motion.div
            variants={fadeUp(0)}
            initial="hidden"
            animate="show"
            className="inline-flex items-center gap-2 rounded-full border border-lime/25 bg-white/5 px-4 py-2 backdrop-blur-sm"
          >
            <Sparkles className="size-3.5 text-lime" strokeWidth={2} aria-hidden />
            <span className="font-mono text-[11px] font-medium tracking-[0.14em] text-[#FAF7F2]/85 uppercase">
              India-first loyalty for local shops
            </span>
          </motion.div>

          <motion.h1
            id="hero-title"
            initial="hidden"
            animate="show"
            variants={wordsContainer}
            className="font-display mt-6 text-[2.75rem] leading-[1.04] font-extrabold tracking-[-0.03em] text-[#FAF7F2] sm:text-[3.75rem] lg:text-[4.5rem] xl:text-[5rem]"
          >
            {HERO_WORDS.map((line, li) => (
              <span key={li} className="block pb-[0.12em]">
                {line.map((w, wi) => (
                  <span
                    key={wi}
                    className="inline-block overflow-hidden pb-[0.08em] -mb-[0.08em] align-bottom"
                  >
                    <motion.span
                      variants={wordVariants}
                      className={
                        w.accent
                          ? "inline-block bg-gradient-to-b from-[#FAF7F2] to-[#FAF7F2]/55 bg-clip-text text-transparent"
                          : "inline-block"
                      }
                    >
                      {w.text}
                      {wi < line.length - 1 ? "\u00A0" : ""}
                    </motion.span>
                  </span>
                ))}
              </span>
            ))}
          </motion.h1>

          <motion.p
            variants={fadeUp(0.6)}
            initial="hidden"
            animate="show"
            className="mt-6 max-w-[54ch] text-pretty text-base leading-7 text-[#FAF7F2]/75 sm:text-[17px] sm:leading-8"
          >
            Every visit deserves appreciation. Discover local businesses, earn
            stamps and points on what you already buy, and get more from the
            places you love — right in your browser.
          </motion.p>

          <motion.div
            variants={fadeUp(0.72)}
            initial="hidden"
            animate="show"
            className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6"
          >
            <PillCta href="#/auth?role=customer" variant="lime" className="sm:px-8">
              Join as a Customer
              <ArrowRight
                className="size-4 transition-transform duration-150 group-hover:translate-x-0.5"
                strokeWidth={2.5}
                aria-hidden
              />
            </PillCta>
            <PillCta
              href="#/auth?role=merchant&mode=register"
              variant="ghost-on-dark"
              className="h-auto px-0 text-[15px]"
            >
              Register your business
            </PillCta>
          </motion.div>

          <motion.p
            variants={fadeUp(0.82)}
            initial="hidden"
            animate="show"
            className="mt-5 text-[13px] font-medium text-[#FAF7F2]/55"
          >
            Free for customers · No app download · Launching in Noida &amp; Greater Noida
          </motion.p>
        </div>

        {/* ——— Device ——— */}
        <motion.div
          style={{ y: yDevice }}
          variants={fadeUp(0.8)}
          initial="hidden"
          animate="show"
          className="relative mx-auto lg:justify-self-end"
        >
          {/* lime focal bloom behind the device */}
          <div
            aria-hidden
            className="absolute top-1/2 left-1/2 -z-10 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime/25 blur-[90px] sm:size-96"
          />
          <PhoneMockup />

          {/* floating proof chips — mid plane */}
          {CHIPS.map((chip) => (
            <motion.div
              key={chip.label}
              style={{ y: yMid }}
              variants={chipIn(chip.delay)}
              initial="hidden"
              animate="show"
              className={`absolute ${chip.pos} z-10`}
            >
              <div className="flex items-center gap-2.5 rounded-full border border-lime/20 bg-[#0A1A00]/60 py-2 pr-4 pl-2.5 backdrop-blur-md">
                <span className="relative flex size-7 items-center justify-center rounded-full bg-lime text-forest">
                  <chip.icon className="size-3.5" strokeWidth={2.2} aria-hidden />
                  <span
                    aria-hidden
                    className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-lime shadow-[0_0_18px_rgba(159,232,112,0.72)]"
                  />
                </span>
                <span className="text-xs font-semibold whitespace-nowrap text-[#FAF7F2]/90">
                  {chip.label}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* bottom marquee — edge-faded, pause on hover */}
      <HeroMarquee />
    </section>
  );
}

const MARQUEE_ITEMS = [
  "Cafés",
  "Salons",
  "Bakeries",
  "Street food",
  "Book shops",
  "Gyms",
  "Sweet shops",
  "Laundry",
  "Chai stalls",
  "Barbers",
];

function HeroMarquee() {
  return (
    <div className="relative border-t border-white/10 py-5">
      <div className="marquee" aria-hidden>
        {[0, 1].map((copy) => (
          <div key={copy} className="marquee__track" aria-hidden={copy === 1}>
            {MARQUEE_ITEMS.map((item) => (
              <span
                key={`${copy}-${item}`}
                className="flex items-center gap-3 font-mono text-[11px] font-medium tracking-[0.18em] whitespace-nowrap text-[#FAF7F2]/50 uppercase"
              >
                {item}
                <span className="size-1 rounded-full bg-lime/60" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
