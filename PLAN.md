# Perk Loop — Build Plan (Planning Mode Output)

> Status: **DELIVERED — all phases shipped** · Created from the product spec + design research + codebase inspection.

---

## 1. Codebase Inspection Result (Phase-1 equivalent)

| Item | Finding |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript 5 — matches requirement |
| UI | Tailwind 4 + complete shadcn/ui (New York) + lucide-react + framer-motion |
| DB | Prisma 6 + SQLite (`db/custom.db`) — schema contains only default `User`/`Post` demo models |
| Existing Perk Loop code | **None.** No accounts, no data to migrate, no legacy balances. Greenfield build. |
| Available libs | zod, zustand, @tanstack/react-query, next-auth v4, input-otp, uuid, sharp, recharts, sonner |

**Conclusion:** No backup/migration of existing data is needed (empty demo DB). We design the final schema from day 1 with an append-only ledger so the *legacy-balance* requirements are satisfied by architecture (nothing to reconcile).

---

## 2. Research Synthesis → Design & Product Decisions

### 2.1 From the YouTube video (`_SVU3oC4JX8` — "25 Tricks to Level Up Claude Design", Jay E / RoboNuggets)
- Start from a **written design system** (tokens in a repo file) before any UI code → we will create `docs/DESIGN.md` + CSS variables first.
- **Never default fonts** (Inter-as-display is the #1 AI-slop tell) → display font ≠ body font.
- **One icon pack, one style** (lucide only), SVG over PNG.
- Study niche players for copy voice; **no invented statistics/testimonials** (aligns with spec §3).
- Audit pass at the end: hierarchy, spacing, contrast, empty states.

### 2.2 From `styles.refero.design` + design research → **chosen direction: "Wise trust core × warm Indian canvas"**
Palette (WCAG-checked pairs, no indigo/blue):

| Token | Value | Use |
|---|---|---|
| Canvas | `#FAF7F2` warm cream | Page background (light) |
| Ink | `#1A1D16` warm near-black | Primary text (never #000) |
| Forest | `#163300` / `#0F4D28` | Headlines on cream, dark sections, sidebar |
| Lime | `#9FE870` | Primary CTA fill on forest/ink, success moments |
| Marigold | `#F59E0B` | Points/stamps warmth, accent badges |
| Sienna | `#B4540A` | Errors-adjacent warm alert, hover states |
| Hairline | `#E7E2D9` | Borders, dividers (3:1 on inputs) |
| Muted text | `#5C5F55` (tinted, never flat gray) | Secondary text |

- **Typography:** display = **Bricolage Grotesque** (expressive, not Inter), body = **Manrope**, numerals = tabular for balances. Sentence case everywhere, no italics.
- **Shape language:** pill CTAs (`rounded-full`), cards 12–24px, nested-radius math (inner = outer − padding), flat elevation with canvas-tinted shadows (max 3 steps).
- Dark mode: forest `#10240F`-family canvas, lime accent retained.

### 2.3 Scroll/motion patterns (from `scroll-craft` + polish skills) — landing page
- Flow reveals: rise 14px + fade, 620ms ease-out, 30–80ms stagger, **fire once**.
- Kinetic headline (line-by-line mask assembly), one clip-path reveal wipe max.
- 3-layer parallax hero (rate delta 10–30%), phone-safe (no `transition: transform` on parallax).
- Pan rail for business categories; ground-color drift cream → tint → dark across sections.
- Pointer tilt/magnet on primary CTA only, fine-pointer gated; `prefers-reduced-motion` respected everywhere.
- Press feedback: `scale(0.96)`/150ms; entrances staggered 100ms; exits 150ms; named transitions, never `all`.
- **Motion is never the only feedback channel** (static color/icon/label cue required) — critical for a money-adjacent wallet.

### 2.4 Domain/competitor research → product guardrails
- LoopyLoyalty/Stamp Me/RateUp patterns: **no app download** (QR/link first), phone-first identity, "<10-min setup" for merchants, 1-tap stamping for counter staff.
- MVP mechanics: stamps-per-visit with progress ring, points-per-₹100, welcome/first-visit bonus, redemption approval by merchant. **Tiers/referrals = phase 2** (out of MVP scope, schema-ready).
- Fraud checklist adopted: single-use short-TTL transaction QR, server-side validation of everything, velocity caps + stamp cooldowns, append-only ledger, staff role separation + audit trail, atomic DB transactions, no negative balances.
- India: QR-native habit (UPI culture), phone/email OTP, Hinglish-friendly microcopy option, honest manual-address until Maps keys exist, DPDP-2023-aware privacy page.
- **Avoid list:** customer app-download requirement, tier systems at MVP, client-trusted issuance, fake analytics, count-up number animations (no real stats yet).

---

## 3. Architecture

### 3.1 Routing constraint → SPA shell
Sandbox preview exposes only `/`. Therefore **all UI lives in `src/app/page.tsx`** as a client SPA shell with **hash routing** (`#/`, `#/auth`, `#/app` (customer), `#/business/{id}`, `#/scan`, `#/merchant`, `#/merchant/program`, …) via a tiny hash-router + zustand. Backend = Next.js route handlers under `src/app/api/**` (per project rules: APIs, not server actions).

### 3.2 Auth (no fake success, ever)
- Custom OTP auth: email OTP + Indian mobile OTP (validation `^[6-9]\d{9}$`).
- OTP codes stored **hashed**, 10-min expiry, ≤5 attempts, resend cooldown 60s / ≤5 per 15min, IP+target rate limits.
- Delivery adapters: SMTP / Twilio Verify via env. **If unconfigured → honest dev-mode**: screen shows code inside a clearly-labeled `DEV MODE — provider not configured` banner; response API states `delivery: "dev"`. Never claims real delivery.
- Session: signed JWT (`jose`) in httpOnly SameSite=Lax cookie, 30-day sliding, roles `CUSTOMER | MERCHANT_OWNER | STAFF`.

### 3.3 Data model (Prisma/SQLite, final)
`User` · `Business` (category enum + config) · `Outlet` · `BusinessMember` (role) · `LoyaltyProgram` (type + zod-validated JSON rules + status draft/active/paused + limits/dates/T&C) · `LoyaltyAccount` (**unique(customerId, businessId)** — the spec's core invariant) · `LedgerEntry` (append-only: EARN/REDEEM/ADJUST/EXPIRE, delta, runningBalance, refs) · `Visit` (+stamp cooldown) · `TxnQr` (one-time token, amount, TTL, single-use, consumedAt) · `Reward` · `Redemption` (request→approve→recorded) · `Feedback` (1–5 stars + text, linked to business/txn) · `OtpCode` · `AuditLog` · `Notification` (in-app for MVP; WhatsApp/SMS modular, only when configured).

### 3.4 QR flows
- **Static outlet QR** (`/o/{code}` inside QR): opens business profile/wallet; starts a visit; visit-based programs award 1 stamp with server-enforced cooldown; **never** awards arbitrary points.
- **One-time transaction QR**: merchant enters amount → server creates `TxnQr` (random token, TTL 5 min, outlet-bound) → customer scans → confirm screen shows business+amount → server validates token/expiry/single-use/customer → **atomic issuance** (unique constraint on consumed token + `updateMany` guard) → ledger entry only on that business's account. Amounts are **merchant-reported** (labeled as such).
- Replay/duplication protection: DB-level unique constraints + conditional updates + audit log.

### 3.5 Redemption
Customer opens business wallet → picks eligible reward → balance checked server-side → creates `Redemption` (PENDING) → merchant approves in dashboard (or staff PIN) → atomic deduction + ledger REDEEM entry → both sides get confirmation. No cross-business points. No negative balances possible.

### 3.6 Honest-states policy (hard rules)
Real data only. Empty states everywhere until real transactions exist. Demo/testing data only inside a clearly-labeled `Perk Loop Demo Café` seeded test business (flagged in UI). Maps → manual entry + "Maps setup required" notice until keys. SMS/email → dev-mode banner. No fake testimonials/stats on landing.

---

## 4. Build Phases (Build Mode — after your approval)

| # | Phase | Task IDs | Key outputs |
|---|---|---|---|
| 0 | Foundation | 1-a | DESIGN.md, fonts, CSS tokens, logo, layout shell, hash-router, zustand session store |
| 1 | Database | 1-b | Final Prisma schema, `db push`, seed = demo business (labeled) only |
| 2 | Auth backend | 2-a | OTP request/verify APIs, rate limits, session cookie, `/api/me` |
| 3 | Loyalty engine | 2-b | Program rules engine + earn/issue/redeem APIs (atomic, ledger, audit) |
| 4 | Customer app | 3-a | Auth screens, wallet, discovery, business wallet, scan confirm, feedback |
| 5 | Merchant app | 3-b | Onboarding, program builder, QR studio (static + txn), transactions, redemptions queue, analytics (real-only), settings/staff |
| 6 | Landing page | 4-a | Hero (brand headline), how-it-works, categories pan-rail, dual CTA, real feature previews, FAQ, legal links + offline broken-heart die-cut asset (printable) |
| 7 | Hardening + E2E | 5-a | Security pass (replay/negative/cross-business/isolation tests via agent-browser), lint, responsive audit, delivery report |

Every phase appends to `worklog.md`. Frontend-first per phase so you see results early.

---

## 5. Decisions I need from you (defaults in bold — reply "approved" to proceed with all)

1. **OTP dev-mode in sandbox** (code shown on screen, clearly labeled, until SMTP/Twilio keys exist) — **Yes** / No
2. **Seed one clearly-labeled demo business** so QR/wallet flows are testable immediately — **Yes** / No
3. **Design direction** (warm cream canvas + forest green + lime/marigold, Bricolage Grotesque + Manrope) — **Approved** / tell me what to change
4. **Currency display** ₹ (INR) — **Yes** / other
5. Anything from the spec you want **deferred** (default defers: tiers, referrals, WhatsApp campaigns, staff multi-outlet permissions → phase 2)
