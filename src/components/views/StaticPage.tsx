"use client";

import type { ReactNode } from "react";
import { Logo, PillCta } from "@/components/landing/primitives";

const CONTACT = "hello@perkloop.in";

function MailLink() {
  return (
    <a
      href={`mailto:${CONTACT}`}
      className="font-semibold text-primary underline underline-offset-4 transition-colors duration-150 hover:text-sienna"
    >
      {CONTACT}
    </a>
  );
}

function TermsLink() {
  return (
    <a
      href="#/terms"
      className="font-semibold text-primary underline underline-offset-4 transition-colors duration-150 hover:text-sienna"
    >
      Terms of Use
    </a>
  );
}

function PrivacyLink() {
  return (
    <a
      href="#/privacy"
      className="font-semibold text-primary underline underline-offset-4 transition-colors duration-150 hover:text-sienna"
    >
      Privacy Policy
    </a>
  );
}

type LegalSection = {
  title: string;
  lead?: string[];
  bullets?: string[];
  after?: string[];
};

type LegalContent = {
  title: string;
  eyebrow: string;
  updated: string;
  intro: string[];
  sections: LegalSection[];
};

const LAST_UPDATED = "17 October 2025";

const PRIVACY: LegalContent = {
  title: "Privacy Policy",
  eyebrow: "Privacy",
  updated: LAST_UPDATED,
  intro: [
    "Plain language, because trust is the whole point. This policy explains what Perk Loop collects, why, and what you can do about it. See also our <TermsLink/>.",
  ],
  sections: [
    {
      title: "1. Who we are",
      lead: [
        "Perk Loop ('we', 'us') is a loyalty platform that connects customers with local businesses in India. Customers earn stamps and points at shops they visit; businesses run and approve their own loyalty programs. We operate the service in your browser and can be contacted at <MailLink/>. We are pre-launch, rolling out first in Noida and Greater Noida.",
      ],
    },
    {
      title: "2. What we collect",
      bullets: [
        "Account basics — your name and one contact identifier (an email address or Indian mobile number), used to sign in with a one-time code.",
        "Loyalty activity — visits, stamps, points, redemptions and the feedback you give, recorded per business.",
        "For business accounts — business name, outlet details, staff roles, and the loyalty program settings you configure.",
        "Technical records — a session cookie and standard server logs (such as IP address and browser type), kept briefly for security and fraud prevention.",
        "Messages — anything you send us when you contact support.",
      ],
    },
    {
      title: "3. What we don't do",
      lead: [
        "We don't sell your personal data — not to businesses on Perk Loop, not to advertisers, not to anyone. We don't run advertising trackers or follow you across other websites, and we don't track your location in the background. When the app shows shops near you, that's based on the area you pick, not continuous monitoring.",
      ],
    },
    {
      title: "4. Why we process your data",
      lead: ["Only to provide and protect the service:"],
      bullets: [
        "To run your account — balances, visits, redemptions and the ledger behind them.",
        "To let a business operate its program and see activity at its own outlets.",
        "To deliver one-time codes and service updates (sign-in, redemption confirmations).",
        "To keep accounts secure — detecting fraud and abuse of rewards.",
        "To comply with applicable law.",
      ],
      after: [
        "Under India's Digital Personal Data Protection Act, 2023, we process your data on the basis of your consent — given when you create an account — for these specified purposes only. You can withdraw consent at any time by asking us to delete your account (see section 8).",
      ],
    },
    {
      title: "5. Who we share it with",
      bullets: [
        "Businesses you visit can see your name and your visits, stamps and redemptions at their own outlets — never your activity at other businesses.",
        "Service providers (for example, email or SMS delivery of one-time codes) process the minimum data needed, on our instructions.",
        "Authorities, where the law requires it.",
      ],
      after: [
        "No one else. A business cannot see your other balances, and no one can buy access to our customer data.",
      ],
    },
    {
      title: "6. Cookies",
      lead: [
        "Perk Loop uses exactly one cookie: an essential, httpOnly session cookie that keeps you signed in. It carries no tracking identifiers and is deleted when you sign out or the session expires. We use no advertising or analytics cookies.",
      ],
    },
    {
      title: "7. How long we keep it",
      lead: [
        "While your account is active, we keep what's needed to run your balances. If you delete your account, we remove your personal data, including your balances — please redeem any pending rewards first. Minimal records (for example, anti-fraud evidence and accounting entries) may be retained in de-identified form where law or fraud prevention requires it.",
      ],
    },
    {
      title: "8. Deleting your data and your rights",
      lead: [
        "Email <MailLink/> from your registered email or mobile number to access a copy of your data, correct it, delete your account, or withdraw consent. We respond within 30 days. Concerns go to our grievance officer at the same address — we acknowledge within 72 hours and work to resolve them quickly.",
      ],
    },
    {
      title: "9. How we protect it",
      lead: [
        "Sign-in codes are stored hashed and expire within minutes; balances are protected by an append-only ledger so every stamp and point can be traced; data travels over encrypted connections. No system is perfect — if you find a vulnerability, tell us at <MailLink/>.",
      ],
    },
    {
      title: "10. Changes to this policy",
      lead: [
        "If we make a material change, we'll tell you in the app (and by email or SMS where we have them) before it takes effect.",
      ],
    },
  ],
};

const TERMS: LegalContent = {
  title: "Terms of Use",
  eyebrow: "Terms",
  updated: LAST_UPDATED,
  intro: [
    "The short version: Perk Loop records loyalty between you and the shops you visit, honestly. These terms explain the rules on both sides. See also our <PrivacyLink/>.",
  ],
  sections: [
    {
      title: "1. The service",
      lead: [
        "Perk Loop is a loyalty platform for local businesses in India. Customers collect stamps or points at businesses they visit and redeem them for rewards the business has published. Businesses create their own programs, verify visits through QR codes, and approve redemptions. Perk Loop provides and records all of this — it is not a payment service; you pay shops directly, as usual. The service works in your browser with no app download, and is rolling out first in Noida and Greater Noida.",
      ],
    },
    {
      title: "2. Your account",
      bullets: [
        "Sign in with your email or Indian mobile number and a one-time code; keep access to that email or phone safe.",
        "One account per person. Provide accurate details — businesses need to recognise you at the counter.",
        "Tell us immediately if you believe someone else has accessed your account.",
      ],
      after: [
        "You must be able to form a binding contract under Indian law to hold an account.",
      ],
    },
    {
      title: "3. Balances and rewards — the honest part",
      bullets: [
        "Every stamp, point and reward belongs to a specific business. A balance with one shop can never be moved, merged or spent at another.",
        "Balances have no cash value. They cannot be sold, transferred, exchanged for money or withdrawn — they exist only to unlock rewards at the business that issued them.",
        "Rewards are offers made by each business, not by Perk Loop. A business may change or end its program going forward; if a business leaves Perk Loop or closes, its rewards and balances end with it.",
        "A redemption is complete only after the business approves it. Every visit, issuance and redemption is recorded in an audit trail you can see in your wallet.",
      ],
      after: [
        "The current program terms for each business are always shown inside that business's page in your wallet.",
      ],
    },
    {
      title: "4. Acceptable use",
      lead: ["Perk Loop only works if balances reflect real visits. Don't:"],
      bullets: [
        "Scan a shop's QR code when you (or the person you're paying for) didn't actually visit.",
        "Create multiple accounts to farm welcome or first-visit rewards.",
        "Sell, barter or advertise rewards, or use balances for anything other than their intended rewards.",
        "Attempt to manipulate balances, codes or the ledger — including automated scraping, probing, or exploiting bugs rather than reporting them.",
        "Use the service to harass businesses, staff or other customers.",
      ],
      after: [
        "We may pause or close accounts that abuse the service; where possible we'll tell you why and how to appeal.",
      ],
    },
    {
      title: "5. For businesses",
      lead: ["If you register a business on Perk Loop, you agree to:"],
      bullets: [
        "Run programs honestly and honour the rewards you publish.",
        "Not change program rules retroactively in a way that erases rewards customers have already earned.",
        "Enter amounts on transaction QR codes that match the actual bill — amounts are labelled merchant-reported and discrepancies are auditable.",
        "Manage your staff accounts and the approvals made under them.",
      ],
    },
    {
      title: "6. Changes to the service",
      lead: [
        "We're pre-launch and still evolving: features may change, pause or end. If a change materially affects your account or balances, we'll notify you in the app (and by email or SMS where we have them) in advance. Because balances are business-specific, one business's changes never affect your balances elsewhere.",
      ],
    },
    {
      title: "7. Disclaimers and liability",
      lead: [
        "The service is provided 'as is'. To the fullest extent permitted by law, we disclaim warranties of uninterrupted availability and fitness for a particular purpose. Except where the law says otherwise, our total liability for any claim relating to the service is limited to the value of the rewards lost from your balance, capped at ₹500. Nothing in these terms limits liability that cannot be limited by law.",
      ],
    },
    {
      title: "8. Governing law",
      lead: [
        "These terms are governed by the laws of India. The courts at Gautam Buddha Nagar, Uttar Pradesh have exclusive jurisdiction over disputes arising from the service.",
      ],
    },
    {
      title: "9. Contact",
      lead: ["Questions, complaints or feedback: <MailLink/>. We aim to reply within two working days."],
    },
  ],
};

const CONTENT: Record<"privacy" | "terms", LegalContent> = {
  privacy: PRIVACY,
  terms: TERMS,
};

/**
 * Content paragraphs are authored as template strings containing tiny
 * <MailLink/>, <TermsLink/>, <PrivacyLink/> markers (this file only — never
 * user input). We split and swap them for real React nodes.
 */
function renderParagraph(text: string, key: string): ReactNode {
  const parts = text.split(/<(MailLink|TermsLink|PrivacyLink)\/>/g);
  return parts.map((part, i) => {
    if (part === "MailLink") return <MailLink key={`${key}-${i}`} />;
    if (part === "TermsLink") return <TermsLink key={`${key}-${i}`} />;
    if (part === "PrivacyLink") return <PrivacyLink key={`${key}-${i}`} />;
    return <span key={`${key}-${i}`}>{part}</span>;
  });
}

function Paragraph({ text, className }: { text: string; className?: string }) {
  return <p className={className}>{renderParagraph(text, text.slice(0, 24))}</p>;
}

export function StaticPage({ page }: { page: "privacy" | "terms" }) {
  const content = CONTENT[page];
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Nav-lite */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <a
            href="#/"
            aria-label="Perk Loop — home"
            className="press inline-flex items-center gap-2.5 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Logo />
            <span className="font-display text-lg font-bold tracking-tight text-primary">
              Perk Loop
            </span>
          </a>
          <div className="flex items-center gap-2">
            <a
              href="#/"
              className="press inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-accent outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Back to home
            </a>
            <PillCta
              href="#/auth?role=customer&mode=register"
              className="hidden h-10 px-5 sm:inline-flex"
            >
              Get started
            </PillCta>
          </div>
        </div>
      </header>

      {/* Prose — 65ch measure per design law */}
      <main
        id="main"
        className="mx-auto w-full max-w-[65ch] flex-1 px-4 py-12 sm:px-6 sm:py-16"
      >
        <p className="text-xs font-semibold tracking-[0.08em] text-sienna uppercase">
          {content.eyebrow}
        </p>
        <h1 className="font-display mt-2 text-3xl font-bold text-primary sm:text-4xl">
          {content.title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Last updated: {content.updated} · Questions? <MailLink />
        </p>

        <div className="mt-8 space-y-4">
          {content.intro.map((text) => (
            <Paragraph
              key={text.slice(0, 40)}
              text={text}
              className="text-[15px] leading-7 text-foreground/85"
            />
          ))}
        </div>

        {content.sections.map((section) => (
          <section
            key={section.title}
            className="mt-10 border-t border-border pt-8"
            aria-labelledby={section.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}
          >
            <h2
              id={section.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}
              className="font-display text-xl font-bold text-primary"
            >
              {section.title}
            </h2>
            {section.lead?.map((text) => (
              <Paragraph
                key={text.slice(0, 40)}
                text={text}
                className="mt-3 text-[14.5px] leading-7 text-foreground/85"
              />
            ))}
            {section.bullets ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-[14.5px] leading-7 text-foreground/85 marker:text-forest/50">
                {section.bullets.map((b) => (
                  <li key={b.slice(0, 40)}>{b}</li>
                ))}
              </ul>
            ) : null}
            {section.after?.map((text) => (
              <Paragraph
                key={text.slice(0, 40)}
                text={text}
                className="mt-3 text-[14.5px] leading-7 text-foreground/85"
              />
            ))}
          </section>
        ))}

        {/* Honest framing — required line */}
        <aside className="mt-12 rounded-2xl border border-border bg-muted p-4 text-[13px] leading-6 text-muted-foreground">
          This page describes how Perk Loop works in plain language and is
          provided for information only — it is not legal advice.
        </aside>
      </main>

      {/* Footer-lite — same sticky-bottom rule (footer on mt-auto) */}
      <footer className="mt-auto border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <Logo className="h-6 w-6" />
              <span className="font-display text-base font-bold text-primary">
                Perk Loop
              </span>
              <span aria-hidden className="mx-1 h-4 w-px bg-border" />
              <span className="text-[13px] text-muted-foreground">
                Your Loyalty Deserves More.
              </span>
            </div>
            <nav aria-label="Footer" className="flex items-center gap-5">
              <a
                href="#/privacy"
                aria-current={page === "privacy" ? "page" : undefined}
                className="rounded-sm text-[13px] text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-[current=page]:font-semibold aria-[current=page]:text-foreground"
              >
                Privacy
              </a>
              <a
                href="#/terms"
                aria-current={page === "terms" ? "page" : undefined}
                className="rounded-sm text-[13px] text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-[current=page]:font-semibold aria-[current=page]:text-foreground"
              >
                Terms
              </a>
              <a
                href={`mailto:${CONTACT}`}
                className="rounded-sm text-[13px] text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                Contact
              </a>
            </nav>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground sm:text-left">
            © {year} Perk Loop · Made with care in Noida, India · Pre-launch —
            rolling out across NCR.
          </p>
        </div>
      </footer>
    </div>
  );
}
