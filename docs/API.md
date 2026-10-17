# Perk Loop — API Contract (v1)

Rules for ALL route handlers (`src/app/api/**`):
- Auth via httpOnly cookie JWT (`getSession()` from `@/lib/session`). Return 401 `{error}` when missing.
- **Every** input validated with zod. Money = integer paise. Points/stamps = positive ints.
- **Server is the only authority** for balances, amounts, eligibility. Never trust client-sent balances/amounts except where stated.
- Rate-limit sensitive endpoints (`@/lib/rate-limit`).
- Write AuditLog for: points issued, redemptions (created/approved/rejected), program changes, QR creation/consumption.
- All balance mutations happen inside `db.$transaction` with conditional `updateMany` guards (no negative balances, no double-spend).
- Error shape: `{ error: string }` + proper HTTP status. Never leak internals/stack.
- DEMO flag: `GET /api/businesses` includes `isDemo`; UI must badge it.

## Auth
| Method/Path | Body | Notes |
|---|---|---|
| POST `/api/auth/otp/request` | `{ channel: "EMAIL"\|"SMS", target, intent: "LOGIN"\|"REGISTER", role?: "CUSTOMER"\|"MERCHANT_OWNER" }` | Validates email or `^[6-9]\d{9}$` phone. Stores sha256-hashed code, 10min expiry, 5 attempts. Resend cooldown 60s (5 per 15min per target, 20/hr per IP). SMS provider unconfigured → `{ delivery: "dev", devCode, devMode: true }` honest dev mode (same for email when SMTP missing). Configured providers → `{ delivery: "sent" }` and NEVER return the code. |
| POST `/api/auth/otp/verify` | `{ channel, target, code, intent?: "LOGIN"\|"REGISTER", role? }` | `intent` defaults to LOGIN (safe: never creates accounts). Verifies hash+expiry+attempts; consumes. On success: LOGIN → must exist; REGISTER → find-or-create User. `createSession()`. Returns `{ user }`. |
| POST `/api/auth/logout` | — | Destroys session cookie. |
| GET `/api/me` | — | `{ user: {id,name,email,phone,role} \| null }` |

## Public discovery
| | | |
|---|---|---|
| GET `/api/businesses?category=&q=` | — | ACTIVE businesses + their ACTIVE program summary + primary outlet city. No customer data. |
| GET `/api/businesses/:id` | — | Business + program(s) + rewards + feedbackEnabled. |

## Static outlet QR flow (`#/o/{code}`)
| | | |
|---|---|---|
| GET `/api/outlets/:code` | — | `{ business, program }` for the check-in screen. |
| POST `/api/outlets/:code/visit` | auth CUSTOMER | Creates Visit + (if STAMPS/STARS program ACTIVE) awards 1 stamp w/ **cooldown: ≥30 min since customer's last visit at this business**; else visit-only. Idempotent per visit row; stamp award inside transaction + ledger + audit. |

## One-time transaction QR flow
| | | |
|---|---|---|
| POST `/api/merchant/qr/txn` | auth MERCHANT/STAFF of business | Body `{ outletId, amountPaise, note? }`. amountPaise 1000..10,000,000 (₹10–₹100,000). Creates TxnQr: token = 32-byte base64url, TTL 5 min. Returns `{ token, expiresAt }` (QR encodes `${origin}/#/t/${token}`). |
| GET `/api/qr/txn/:token` | auth CUSTOMER | Preview: `{ business, outlet, amountPaise, expiresAt }` or `{ error }` if consumed/expired. |
| POST `/api/qr/txn/:token/confirm` | auth CUSTOMER | **Atomic:** re-check status PENDING + not expired → conditional `updateMany({ status: "PENDING", expiresAt gt now }, { status: "CONSUMED", consumedById })` (count must be 1) → award per program POINTS rule → ledger + Visit(source TXN) + audit. Any failure rolls back. |

## Loyalty program config (merchant)
| | | |
|---|---|---|
| GET `/api/merchant/business` | auth | Owner's business + outlets + programs + rewards. |
| POST `/api/merchant/business` | auth | Register business: `{ name, category, description?, addressLine?, city?, state?, pincode?, phone?, logoUrl? }` → creates Business + primary Outlet + membership OWNER; upgrades User role. |
| PUT `/api/merchant/business` | auth | Update own business fields. |
| POST `/api/merchant/outlets` | auth | Add outlet `{ name, addressLine? }`. |
| GET/POST/PUT `/api/merchant/program` | auth | Create/update program per §schema; zod-validates config per type; status DRAFT/ACTIVE/PAUSED; one ACTIVE program per type per business. |
| GET/POST/PUT/DELETE `/api/merchant/rewards` | auth | CRUD rewards for own program. |

## Wallet (customer)
| | | |
|---|---|---|
| GET `/api/wallet` | auth CUSTOMER | All loyalty accounts: `{ accounts: [{ business, points, stamps, visitCount, lastVisitAt, activeRewards }] }`. |
| GET `/api/wallet/:businessId` | auth CUSTOMER | One account + ledger (desc, 100) + available rewards + eligibility flags. |
| POST `/api/wallet/:businessId/redeem` | auth CUSTOMER | Body `{ rewardId }`. Validates: reward active, program ACTIVE, account balance ≥ cost (per unit), per-customer redemption limit. Creates Redemption PENDING — **no balance change yet**. Reject if an existing PENDING redemption for same customer+business exists (one at a time). |
| GET `/api/redemptions` | auth CUSTOMER | Customer's redemption history. |

## Merchant operations
| | | |
|---|---|---|
| GET `/api/merchant/redemptions?status=` | auth | Queue for own business. |
| POST `/api/merchant/redemptions/:id/decide` | auth | Body `{ decision: "APPROVED"\|"REJECTED" }`. **On APPROVED: atomic** — re-check balance ≥ cost → `updateMany` account decrement (guard `points ≥ cost` / `stamps ≥ cost`) → ledger REDEEM → redemption APPROVED + decidedBy → audit + notification. REJECTED just closes request. |
| GET `/api/merchant/txns?limit=` | auth | Recent TxnQr for own business (status, amount, time). |
| GET `/api/merchant/analytics` | auth | **Real aggregates only** (empty → zeros): total customers (accounts), active in last 30d, visits 7d/30d, points issued 30d, redemptions 30d, repeat-rate (customers with ≥2 visits / total), top recent txns. |
| GET `/api/merchant/feedback` | auth | Feedback for own business. |

## Feedback & notifications
| | | |
|---|---|---|
| POST `/api/feedback` | auth CUSTOMER | `{ businessId, rating 1..5, comment?, tags? }` — must have ≥1 visit/account; 1 per customer/business per 24h; rate-limited. |
| GET `/api/notifications` | auth | In-app list, newest first (50). |
| POST `/api/notifications/read` | auth | Mark all read. |

## Security invariants (TEST list)
1. Points from business A can NEVER move via business B endpoints.
2. Merchant A cannot read/write merchant B data (every merchant route filters by membership).
3. One-time token: replay → 409; expired → 410; wrong customer still consumes only on confirm.
4. Redemption approve twice → 409. Balance can never go negative (DB guard).
5. Customer cannot choose arbitrary points — amount comes from TxnQr created by merchant only.
6. OTP: expired/attempt-exceeded/consumed codes rejected; dev mode only when provider missing.
7. Rate limits on otp/request, otp/verify, feedback, qr/confirm.
