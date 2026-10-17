"use client";

import type { MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useReveal } from "./useReveal";

/** Shared motion curves — docs/DESIGN.md §6/§7. */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const EASE_HERO: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ------------------------------------------------------------------ */
/* Flow reveal wrapper (failure-safe, see globals.css .reveal)          */
/* ------------------------------------------------------------------ */

type RevealTag = "div" | "section" | "li" | "span" | "p" | "figure" | "ul";

/**
 * Adds the `.reveal` utility class and reveals the element once when it
 * enters the viewport. `delay` staggers siblings in 60ms steps (design law).
 * Wrap elements — never put `press`/hover transitions on the same node.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
  id,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: RevealTag;
  id?: string;
  "aria-label"?: string;
}) {
  const ref = useReveal<HTMLDivElement>();
  const Tag = as as "div";
  return (
    <Tag
      ref={ref}
      id={id}
      aria-label={ariaLabel}
      className={cn("reveal", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/* In-page anchors                                                     */
/* ------------------------------------------------------------------ */

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

/**
 * In-page anchor handler: the href stays real (no-JS fallback), but we scroll
 * smoothly and keep the hash router from re-parsing the URL as a route.
 */
export function onAnchorClick(id: string) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.history.replaceState(null, "", `#${id}`);
    scrollToId(id);
  };
}

/* ------------------------------------------------------------------ */
/* Logo                                                                */
/* ------------------------------------------------------------------ */

export function Logo({ className }: { className?: string }) {
  return <img src="/logo.svg" alt="" className={cn("h-8 w-8", className)} />;
}

/* ------------------------------------------------------------------ */
/* Pill CTA (design law: rounded-full, h >= 44px, press scale)          */
/* ------------------------------------------------------------------ */

const pillVariants = {
  forest: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft",
  lime: "bg-lime text-forest hover:bg-lime/90 shadow-soft",
  outline: "border border-input bg-card text-foreground hover:bg-accent shadow-soft",
  "outline-on-dark": "border border-white/25 text-background hover:bg-white/10",
  "ghost-on-dark": "text-background underline underline-offset-8 decoration-white/40 hover:decoration-lime",
} as const;

export function PillCta({
  href,
  variant = "forest",
  className,
  children,
  onClick,
  "aria-label": ariaLabel,
}: {
  href: string;
  variant?: keyof typeof pillVariants;
  className?: string;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  "aria-label"?: string;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "press group inline-flex h-12 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 text-sm font-semibold transition-[background-color,border-color,color,box-shadow] duration-150 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-offset-2",
        pillVariants[variant],
        className,
      )}
    >
      {children}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Mono micro label — eyebrows, metadata, indices (DESIGN.md §3)        */
/* ------------------------------------------------------------------ */

export function MicroLabel({
  children,
  className,
  dark = false,
}: {
  children: ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <p
      className={cn(
        "font-mono text-[11px] font-medium uppercase tracking-[0.14em]",
        dark ? "text-lime/90" : "text-sienna",
        className,
      )}
    >
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Section heading — display-scale H2, varied ledgers (DESIGN.md §B)    */
/* ------------------------------------------------------------------ */

export function SectionHead({
  eyebrow,
  index,
  title,
  sub,
  dark = false,
  align = "center",
  className,
}: {
  eyebrow?: string;
  index?: string;
  title: ReactNode;
  sub?: ReactNode;
  dark?: boolean;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className,
      )}
    >
      {eyebrow || index ? (
        <Reveal>
          <p
            className={cn(
              "flex items-center gap-3 font-mono text-[11px] font-medium uppercase tracking-[0.14em]",
              align === "center" && "justify-center",
              dark ? "text-lime/90" : "text-sienna",
            )}
          >
            {index ? (
              <span
                aria-hidden
                className={cn(
                  "inline-block h-px w-8",
                  dark ? "bg-lime/40" : "bg-sienna/40",
                )}
              />
            ) : null}
            {index ? `${index} — ` : ""}
            {eyebrow}
          </p>
        </Reveal>
      ) : null}
      <Reveal delay={60}>
        <h2
          className={cn(
            "font-display mt-3 text-balance text-[1.75rem] font-extrabold leading-[1.08] tracking-[-0.02em] sm:text-[2.25rem] lg:text-[2.75rem]",
            dark ? "text-[#FAF7F2]" : "text-ink",
          )}
        >
          {title}
        </h2>
      </Reveal>
      {sub ? (
        <Reveal delay={120}>
          <p
            className={cn(
              "mt-4 text-pretty text-[15px] leading-7 sm:text-base",
              dark ? "text-[#FAF7F2]/70" : "text-body",
            )}
          >
            {sub}
          </p>
        </Reveal>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Corner brackets — technical framing ornament (DESIGN.md §5)          */
/* ------------------------------------------------------------------ */

export function CornerBrackets({ className }: { className?: string }) {
  const base =
    "pointer-events-none absolute size-4 border-lime/70";
  return (
    <div aria-hidden className={cn("absolute inset-0", className)}>
      <span className={cn(base, "top-3 left-3 rounded-tl-[2px] border-t-2 border-l-2")} />
      <span className={cn(base, "top-3 right-3 rounded-tr-[2px] border-t-2 border-r-2")} />
      <span className={cn(base, "bottom-3 left-3 rounded-bl-[2px] border-b-2 border-l-2")} />
      <span className={cn(base, "right-3 bottom-3 rounded-br-[2px] border-r-2 border-b-2")} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rotating circular badge (SVG textPath, reduced-motion static)        */
/* ------------------------------------------------------------------ */

export function CircularBadge({
  text,
  className,
  icon,
}: {
  text: string;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative flex size-28 items-center justify-center rounded-full",
        className,
      )}
    >
      <svg viewBox="0 0 100 100" className="spin-slow absolute inset-0 size-full">
        <defs>
          <path id="badge-circle" d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" />
        </defs>
        <text
          fill="currentColor"
          style={{
            fontSize: "10.5px",
            fontWeight: 600,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          <textPath href="#badge-circle">{text}</textPath>
        </text>
      </svg>
      <span className="flex size-11 items-center justify-center rounded-full bg-lime text-forest shadow-soft">
        {icon}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stamp row — punched slots that fill lime (the signature object)      */
/* ------------------------------------------------------------------ */

export function StampRow({
  value,
  total,
  size = 26,
  className,
}: {
  value: number;
  total: number;
  size?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", className)} aria-hidden>
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < value;
        const isLast = i === value - 1;
        return (
          <span
            key={i}
            className={cn(
              "flex items-center justify-center rounded-full transition-colors duration-300",
              filled
                ? "bg-lime text-forest"
                : "bg-transparent text-forest/30",
            )}
            style={{
              width: size,
              height: size,
              boxShadow: filled ? "inset 0 -1px 2px rgba(22,51,0,0.18)" : "var(--shadow-stamp-slot)",
              border: filled ? "none" : "1.5px dashed rgba(22,51,0,0.3)",
            }}
          >
            {filled ? (
              <svg viewBox="0 0 24 24" fill="none" style={{ width: size * 0.55, height: size * 0.55 }}>
                <path
                  d="M12 2.6l2.6 5.7 6.2.7-4.6 4.2 1.2 6.1-5.4-3-5.4 3 1.2-6.1L3.2 9l6.2-.7L12 2.6z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <span className="size-1 rounded-full bg-forest/20" />
            )}
          </span>
        );
      })}
    </div>
  );
}
