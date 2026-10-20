"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Brush,
  Candy,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Croissant,
  CupSoda,
  Dumbbell,
  Scissors,
  Shirt,
  UtensilsCrossed,
} from "lucide-react";
import { Reveal, SectionHead } from "./primitives";

const CATEGORIES = [
  { icon: Coffee, name: "Cafés", tint: "bg-forest-soft text-forest" },
  { icon: Scissors, name: "Salons", tint: "bg-lime-soft text-forest" },
  { icon: Croissant, name: "Bakeries", tint: "bg-marigold-soft text-sienna" },
  { icon: UtensilsCrossed, name: "Street food", tint: "bg-forest-soft text-forest" },
  { icon: BookOpen, name: "Book shops", tint: "bg-lime-soft text-forest" },
  { icon: Dumbbell, name: "Gyms", tint: "bg-marigold-soft text-sienna" },
  { icon: Candy, name: "Sweet shops", tint: "bg-forest-soft text-forest" },
  { icon: CupSoda, name: "Chai stalls", tint: "bg-lime-soft text-forest" },
  { icon: Shirt, name: "Laundry", tint: "bg-marigold-soft text-sienna" },
  { icon: Brush, name: "Barbers", tint: "bg-forest-soft text-forest" },
];

const arrowClasses =
  "press inline-flex size-11 items-center justify-center rounded-full border border-forest/15 bg-card text-ink shadow-soft transition-colors duration-150 hover:border-forest hover:bg-forest hover:text-[#FAF7F2] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40";

/**
 * Linen band (#F1EEE9, surface L2) with a horizontal pan-rail of the shop
 * categories Perk Loop launches with. Native scroll (reduced-motion safe),
 * scroll-snap proximity, keyboard-reachable overflow region, and circular
 * arrow buttons that hide on touch-only devices.
 */
export function CategoriesRail() {
  const railRef = useRef<HTMLUListElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const syncArrows = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    syncArrows();
    window.addEventListener("resize", syncArrows);
    return () => window.removeEventListener("resize", syncArrows);
  }, [syncArrows]);

  const scrollByAmount = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * 320, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section className="bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
        <div className="flex items-end justify-between gap-6">
          <SectionHead
            align="left"
            index="02"
            eyebrow="Categories"
            title="Built for the shops you already visit"
            sub="From your morning café to your weekend sweet run — every business runs its own program, and your balance with each one stays separate."
          />
          <Reveal delay={120} className="hidden shrink-0 gap-2 sm:flex [@media(pointer:coarse)]:hidden">
            <button
              type="button"
              onClick={() => scrollByAmount(-1)}
              disabled={!canLeft}
              aria-label="Scroll categories back"
              className={arrowClasses}
            >
              <ChevronLeft className="size-4" aria-hidden strokeWidth={2.25} />
            </button>
            <button
              type="button"
              onClick={() => scrollByAmount(1)}
              disabled={!canRight}
              aria-label="Scroll categories forward"
              className={arrowClasses}
            >
              <ChevronRight className="size-4" aria-hidden strokeWidth={2.25} />
            </button>
          </Reveal>
        </div>

        <Reveal delay={140} className="mt-10">
          <ul
            ref={railRef}
            onScroll={syncArrows}
            tabIndex={0}
            aria-label="Shop categories — scroll for more"
            className="scroll-slim -mx-4 flex snap-x snap-proximity gap-4 overflow-x-auto px-4 pt-1 pb-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [mask-image:linear-gradient(to_right,transparent,black_28px,black_calc(100%_-_28px),transparent)] sm:-mx-6 sm:px-6"
          >
            {CATEGORIES.map((cat) => (
              <li
                key={cat.name}
                className="w-[180px] shrink-0 snap-start rounded-[18px] border border-forest/8 bg-card p-5 shadow-soft transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card"
              >
                <span
                  className={`flex size-11 items-center justify-center rounded-xl ${cat.tint}`}
                >
                  <cat.icon className="size-5" aria-hidden strokeWidth={1.5} />
                </span>
                <p className="font-display mt-4 text-[15px] font-bold text-ink">{cat.name}</p>
                <p className="mt-1 font-mono text-[11px] font-medium tracking-[0.12em] text-fg-tertiary uppercase">
                  Noida · pilot
                </p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
