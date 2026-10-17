"use client";

import { useEffect, useRef } from "react";

/**
 * Flow-reveal observer (docs/DESIGN.md motion rules).
 *
 * Pairs with the `.reveal` utility in globals.css: the element starts at
 * opacity 0 / translateY(14px) and gains `.is-visible` the first time it
 * enters the viewport — 620ms cubic-bezier(0.22, 1, 0.36, 1), fires exactly
 * once (reveals never replay). Stagger is applied by the caller via a
 * `transition-delay` inline style (see <Reveal />), typically 60ms steps.
 *
 * `prefers-reduced-motion` is handled purely in CSS: the utility swaps the
 * transform for a plain 300ms opacity fade.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Very old browsers without IntersectionObserver: never hide content.
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("is-visible");
            io.disconnect(); // fire once
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -36px 0px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return ref;
}
