# Perk Loop

**India-first loyalty & rewards platform** — digital stamp cards, a points wallet, and QR-secured earn/redeem flows for local businesses, with a full merchant dashboard. Built as a production-shaped MVP: real database, real auth, real money-adjacent logic (append-only ledger, atomic guards), not a visual demo.

`Next.js 16` · `TypeScript (strict)` · `Prisma 6 + SQLite` · `Tailwind CSS 4` · `shadcn/ui` · `Zustand` · `Framer Motion`

---

## What's inside

### Customer app (mobile-first)
- **Discover** — browse local businesses by category, outlet info, live program details
- **Wallet** — one wallet per business: punch-card progress + points balance side by side
- **Scan** — two ways to earn:
  1. **Static outlet QR** → one stamp per visit, 30-minute cooldown
  2. **Merchant transaction QR** → one-time token, 5-minute TTL, earns points on paid bills
- **Redeem** — spend points on rewards; merchant approves; ledger is append-only
- **History & notifications** — every earn/redeem event recorded and notified

### Merchant dashboard
- **Program builder** — punch-card (N stamps → reward) and points (X pts per ₹100) programs
- **Rewards catalogue** — create/edit rewards with point costs and stock
- **QR Studio** — printable static outlet cards (with punch-hole guide) + live transaction QR generator
- **Redemption approvals** — verify + approve/decline with one tap
- **Analytics** — visits, points issued/redeemed, top customers (Recharts)
- **Outlets & staff flows** — per-outlet static codes, transaction issue screen

### Landing page
Marketing site with scroll-reveal animations, category rail, how-it-works, business CTA, FAQ.

---

## Loyalty engine & security model

Money-adjacent systems get money-adjacent guards:

| Threat | Defense |
|---|---|
| Replaying a transaction QR | One-time token, 5-min TTL, consumed atomically → replay returns `409` |
| Guessing/inflating balances | Append-only `PointLedger` / visit records; balances are derived, never directly writable |
| Race conditions on concurrent scans | `$transaction` + `updateMany` conditional guards (rows-affected checks) |
| Seeing another customer's wallet | `unique(customerId, businessId)` — lookups are scoped, cross-customer access impossible |
| Stamp farming | 30-min per-outlet cooldown, server-enforced |
| OTP brute force | Salted SHA-256 hashed codes, 5-min TTL, ≤5 attempts, rate-limited requests |
| Cross-merchant tampering | Ownership re-check on every merchant mutation → `403` |
| Session theft | JWT in `httpOnly` `SameSite=Lax` cookies, issuer/audience verified |

Full API reference: [`docs/API.md`](docs/API.md) · Design system: [`docs/DESIGN.md`](docs/DESIGN.md)

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), 27 API route handlers, zero server actions |
| Language | TypeScript 5, strict mode |
| Database | Prisma 6 + SQLite (15 models, append-only ledgers) |
| UI | Tailwind CSS 4, shadcn/ui (New York), Lucide icons |
| Motion | Framer Motion 12 (scroll reveal, view transitions) |
| State | Zustand (client), self-hosted hash router (`#/app`, `#/merchant`) |
| Auth | OTP (email/SMS) + JWT session cookies (jose) |
| Validation | Zod schemas on every route boundary |
| Fonts | Bricolage Grotesque (display) + Manrope (body) |

---

## Quickstart

```bash
bun install
cp .env.example .env        # defaults work for local dev
bun run db:push             # create SQLite schema
bun prisma/seed.ts          # seed demo data
bun run dev                 # http://localhost:3000
```

### Demo accounts (after seeding)

| Role | Login | OTP |
|---|---|---|
| Merchant | `demo-merchant@perkloop.in` | DEV MODE shows the code in the UI |
| Customer | `qa-customer@perkloop.in` | DEV MODE shows the code in the UI |

> **DEV MODE**: with no email/SMS provider configured, OTP codes are surfaced in the UI (honestly labelled). Configure `RESEND_API_KEY` or Twilio vars (see `.env.example`) and DEV MODE disappears — no code changes needed.

### Backend verification

```bash
bun scripts/e2e-backend.ts   # 31 end-to-end API checks — all must PASS
```

---

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | SQLite file (dev) or Postgres URL (prod) |
| `SESSION_SECRET` | prod | Signs JWT session cookies (fallback in dev) |
| `OTP_SALT` | prod | Salts OTP hashes (fallback in dev) |
| `RESEND_API_KEY` + `SMTP_FROM` | optional | Email OTP delivery |
| `SMTP_HOST/PORT/USER/PASS` | optional | Generic SMTP delivery |
| `TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER` | optional | SMS OTP delivery |

---

## Deploying to production

1. **Database** — create a Postgres instance (Supabase free tier works), switch `provider = "postgresql"` in `prisma/schema.prisma`, set `DATABASE_URL`, run `bun run db:push && bun prisma/seed.ts`
2. **Secrets** — generate `SESSION_SECRET` and `OTP_SALT` (`openssl rand -hex 32` for each)
3. **OTP delivery** — add `RESEND_API_KEY` (email) and/or Twilio vars (SMS)
4. **Host** — deploy to Vercel (zero-config for Next.js 16)

---

## Project structure

```
prisma/            schema (15 models) + seed
src/app/api/       27 route handlers (auth, wallet, merchant, QR, notifications)
src/components/
  landing/         marketing site sections
  customer/        wallet app tabs (home, discover, scan, history, profile)
  merchant/        dashboard modules (programs, QR studio, redemptions, analytics)
  auth/            OTP login + business registration
  views/           hash-router view shells
  ui/              shadcn/ui primitives
src/lib/           loyalty engine, OTP, sessions, rate limit, delivery, validation
scripts/           e2e backend checks + demo data utilities
docs/              API reference, design system, technical documentation (PDF)
PLAN.md            full build plan (planning-mode artifact)
```

---

## Status

MVP complete — all planned phases delivered. See [`PLAN.md`](PLAN.md) for scope decisions and [`docs/Perk_Loop_Technical_Documentation.pdf`](docs/Perk_Loop_Technical_Documentation.pdf) for the full technical write-up (architecture, security, production checklist, free-tier strategy).
