"use client";

import type { ReactNode } from "react";
import { Logo, onAnchorClick } from "./primitives";

const PRODUCT_LINKS = [
  { label: "How it works", href: "#how-it-works", anchor: true },
  { label: "For business", href: "#for-business", anchor: true },
  { label: "FAQ", href: "#faq", anchor: true },
];

const COMPANY_LINKS = [
  { label: "Privacy", href: "#/privacy" },
  { label: "Terms", href: "#/terms" },
  { label: "Contact — hello@perkloop.in", href: "mailto:hello@perkloop.in" },
];

const LAUNCH_CITY = ["Noida", "Greater Noida", "Delhi NCR — soon"];

const linkFocus = "outline-none focus-visible:ring-[3px] focus-visible:ring-lime/60 rounded-sm";

function FooterLink({
  href,
  anchor,
  children,
}: {
  href: string;
  anchor?: boolean;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      onClick={anchor ? onAnchorClick(href.replace(/^#/, "")) : undefined}
      className={`inline-block text-sm text-[#FAF7F2]/65 transition-colors duration-150 hover:text-[#FAF7F2] ${linkFocus}`}
    >
      {children}
    </a>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <nav aria-label={title}>
      <h2 className="font-mono text-[11px] font-medium tracking-[0.14em] text-[#FAF7F2]/65 uppercase">
        {title}
      </h2>
      <ul className="mt-4 space-y-2.5">{children}</ul>
    </nav>
  );
}

/**
 * Full-bleed dark footer (#0B1A00). `mt-auto` keeps it pinned to the bottom
 * of the flex column on short pages (sticky-footer law, docs/DESIGN.md §10).
 */
export function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto bg-[#0B1A00] text-[#FAF7F2] grain-dark">
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1.2fr_1fr] md:gap-8">
          <div>
            <a
              href="#/"
              aria-label="Perk Loop — home"
              className={`press inline-flex items-center gap-2.5 ${linkFocus}`}
            >
              <Logo />
              <span className="font-display text-lg font-bold tracking-tight text-[#FAF7F2]">
                Perk&nbsp;Loop
              </span>
            </a>
            <p className="mt-3 text-sm font-semibold text-[#FAF7F2]/90">
              Your Loyalty Deserves More.
            </p>
            <p className="mt-3 flex items-center gap-2 text-[13px] text-[#FAF7F2]/55">
              <span aria-hidden className="size-2 rounded-full bg-lime ring-2 ring-lime/25" />
              Pre-launch — rolling out shop by shop.
            </p>
          </div>

          <FooterColumn title="Product">
            {PRODUCT_LINKS.map((link) => (
              <li key={link.label}>
                <FooterLink href={link.href} anchor={link.anchor}>
                  {link.label}
                </FooterLink>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title="Company">
            {COMPANY_LINKS.map((link) => (
              <li key={link.label}>
                <FooterLink href={link.href}>{link.label}</FooterLink>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title="Launch city">
            {LAUNCH_CITY.map((city) => (
              <li key={city} className="text-sm text-[#FAF7F2]/65">
                {city}
              </li>
            ))}
          </FooterColumn>
        </div>

        <div className="mt-12 flex flex-col justify-between gap-3 border-t hairline-dark pt-6 sm:flex-row sm:items-center">
          <p className="text-[13px] text-[#FAF7F2]/55">
            © {year} Perk Loop · Made with care in Noida
          </p>
          <p className="font-mono text-[11px] font-medium tracking-[0.14em] text-[#FAF7F2]/65 uppercase">
            Every visit counts.
          </p>
        </div>
      </div>
    </footer>
  );
}
