/**
 * Reward Jar — DEDICATED CONCURRENCY REGRESSION SUITE (review round 2, issue 3).
 *
 * Fires genuinely simultaneous HTTP requests (Promise.all) at a dev server and
 * asserts that exactly ONE winner survives each race. The 31-test smoke suite
 * runs sequentially, which is why it passed identically before and after the
 * serializable-transaction remediation — this suite is the actual evidence.
 *
 * Run it against a dev server whose DATABASE_URL points at PostgreSQL:
 *   DATABASE_URL="postgres://..." bun scripts/concurrency-test.ts
 *
 * Self-contained: creates its own users/business via the API, then removes
 * every test row through a direct Prisma connection (users, businesses,
 * audit logs, OTP codes). Production data is never touched.
 */

import { PrismaClient } from "@prisma/client";

const B = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const RUN = Date.now().toString(36);
const EMAIL_DOMAIN = `cc-test-${RUN}.invalid`;
const PDB = new PrismaClient();

const PASS: string[] = [];
const FAIL: string[] = [];

function check(name: string, cond: boolean, detail = "") {
  (cond ? PASS : FAIL).push(name);
  console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? "  | " + detail : ""}`);
}

type Jar = Map<string, string>;

function client() {
  const jar: Jar = new Map();
  const spoofIp = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  return {
    async req(method: string, path: string, body?: unknown): Promise<{ status: number; data: any }> {
      const res = await fetch(B + path, {
        method,
        headers: {
          "x-forwarded-for": spoofIp,
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(jar.size ? { Cookie: [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ") } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) {
        const [pair] = setCookie.split(";");
        const eq = pair.indexOf("=");
        jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      }
      let data: any = {};
      try { data = await res.json(); } catch { /* empty body */ }
      return { status: res.status, data };
    },
  };
}

async function register(c: ReturnType<typeof client>, target: string, role: string) {
  const r1 = await c.req("POST", "/api/auth/otp/request", { channel: "EMAIL", target, intent: "REGISTER", role });
  if (!r1.data.devCode) throw new Error(`otp request failed: ${JSON.stringify(r1.data)}`);
  const r2 = await c.req("POST", "/api/auth/otp/verify", { channel: "EMAIL", target, code: r1.data.devCode, intent: "REGISTER", role });
  if (r2.status !== 200 || !r2.data.user) throw new Error(`verify failed: ${JSON.stringify(r2.data)}`);
  return r2.data.user;
}

/** Assert exactly one response of `statuses` succeeded and the rest conflict. */
function exactlyOneWinner(name: string, results: { status: number }[], winnerStatuses: number[], loserStatuses: number[]) {
  const winners = results.filter((r) => winnerStatuses.includes(r.status));
  const losersOk = results.every((r) => winnerStatuses.includes(r.status) || loserStatuses.includes(r.status));
  check(name, winners.length === 1 && losersOk, `statuses=${results.map((r) => r.status).join(",")}`);
  return winners.length === 1;
}

async function main() {
  const ts = Date.now();
  const businessIds: string[] = [];
  runBusinessIds = businessIds; // shared with the cleanup handler

  // ── Setup: two merchants, three customers ────────────────────────────────
  const merchA = client(), merchB = client();
  const custA = client(), custB = client(), custC = client();

  await register(merchA, `ma${ts}@${EMAIL_DOMAIN}`, "MERCHANT_OWNER");
  await register(merchB, `mb${ts}@${EMAIL_DOMAIN}`, "MERCHANT_OWNER");
  const custAUser = await register(custA, `ca${ts}@${EMAIL_DOMAIN}`, "CUSTOMER");
  await register(custB, `cb${ts}@${EMAIL_DOMAIN}`, "CUSTOMER");
  await register(custC, `cc3${ts}@${EMAIL_DOMAIN}`, "CUSTOMER");

  const bizA = await merchA.req("POST", "/api/merchant/business", { name: `CC Race A ${RUN}`, category: "SALON", city: "Noida", addressLine: "CC-1" });
  const bizB = await merchB.req("POST", "/api/merchant/business", { name: `CC Race B ${RUN}`, category: "CAFE", city: "Noida", addressLine: "CC-2" });
  const bizAId = bizA.data.business.id as string;
  const bizBId = bizB.data.business.id as string;
  businessIds.push(bizAId, bizBId);
  const outletAId = bizA.data.business.outlets[0].id as string;
  const outletBId = bizB.data.business.outlets[0].id as string;

  const progA = await merchA.req("POST", "/api/merchant/program", { businessId: bizAId, name: "CC points A", type: "POINTS", config: { pointsPerRupeePaise: 10 }, status: "ACTIVE", perCustomerLimit: 1 });
  const progB = await merchB.req("POST", "/api/merchant/program", { businessId: bizBId, name: "CC points B", type: "POINTS", config: { pointsPerRupeePaise: 10 }, status: "ACTIVE" });
  const progAId = progA.data.program.id as string;
  const progBId = progB.data.program.id as string;
  const rewardA = await merchA.req("POST", "/api/merchant/rewards", { programId: progAId, title: "CC tea A", cost: 1, unit: "POINTS" });
  const rewardB = await merchB.req("POST", "/api/merchant/rewards", { programId: progBId, title: "CC tea B", cost: 1, unit: "POINTS" });
  const rewardAId = rewardA.data.reward.id as string;
  const rewardBId = rewardB.data.reward.id as string;

  // Give customers big balances via one-time txn QRs (₹1000 → 100 pts @ 10/₹100).
  const tA = await merchA.req("POST", "/api/merchant/qr/txn", { outletId: outletAId, amountPaise: 100000 });
  const tB = await merchB.req("POST", "/api/merchant/qr/txn", { outletId: outletBId, amountPaise: 100000 });
  await custA.req("POST", `/api/qr/txn/${tA.data.token}/confirm`);
  await custB.req("POST", `/api/qr/txn/${tB.data.token}/confirm`);
  const tC = await merchA.req("POST", "/api/merchant/qr/txn", { outletId: outletAId, amountPaise: 100000 });
  await custC.req("POST", `/api/qr/txn/${tC.data.token}/confirm`);

  // ── RACE 1 (audit F02): simultaneous redemptions vs perCustomerLimit=1 ──
  {
    const results = await Promise.all(
      Array.from({ length: 8 }, () => custA.req("POST", `/api/wallet/${bizAId}/redeem`, { rewardId: rewardAId }))
    );
    const ok = exactlyOneWinner("RACE 1: 8 simultaneous redeems, limit=1 → exactly 1 succeeds", results, [200, 201], [400, 403, 409]);
    const queue = await merchA.req("GET", "/api/merchant/redemptions?status=PENDING");
    const pending = (queue.data.redemptions ?? []).filter((r: any) => r.customer.id === custAUser.id);
    check("RACE 1: exactly 1 PENDING in merchant queue", ok && pending.length === 1, `pending=${pending.length}`);
    const wallet = await custA.req("GET", `/api/wallet/${bizAId}`);
    check("RACE 1: balance untouched before approval (100 pts)", wallet.data.account.points === 100, `points=${wallet.data.account.points}`);
  }

  // ── RACE 2 (audit F02): simultaneous redeems vs one-pending rule ─────────
  {
    const results = await Promise.all(
      Array.from({ length: 7 }, () => custB.req("POST", `/api/wallet/${bizBId}/redeem`, { rewardId: rewardBId }))
    );
    exactlyOneWinner("RACE 2: 7 simultaneous redeems, no limit → 1 winner + 6× 409 one-pending", results, [200, 201], [409]);
  }

  // ── RACE 3 (double-spend): simultaneous confirms of ONE txn QR ───────────
  {
    const t = await merchA.req("POST", "/api/merchant/qr/txn", { outletId: outletAId, amountPaise: 50000 }); // ₹500 → 50 pts
    const token = t.data.token as string;
    const results = await Promise.all(
      Array.from({ length: 8 }, () => custC.req("POST", `/api/qr/txn/${token}/confirm`))
    );
    const ok = exactlyOneWinner("RACE 3: 8 simultaneous confirms of one QR → exactly 1 awards", results, [200], [409, 410]);
    const winners = results.filter((r) => r.status === 200);
    check("RACE 3: winner awarded exactly 50 pts once", ok && winners[0]?.data?.pointsAwarded === 50, JSON.stringify(winners[0]?.data ?? {}).slice(0, 120));
    const wallet = await custC.req("GET", `/api/wallet/${bizAId}`);
    check("RACE 3: custC balance = 150 (100 + 50, no double award)", wallet.data.account.points === 150, `points=${wallet.data.account.points}`);
  }

  // ── RACE 4 (audit F03): simultaneous program activations ─────────────────
  {
    const pause = await merchB.req("PUT", "/api/merchant/program", { id: progBId, status: "PAUSED" });
    check("RACE 4 setup: program paused", pause.status === 200, String(pause.status));
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        merchB.req("POST", "/api/merchant/program", { businessId: bizBId, name: `CC dup ${Math.random()}`, type: "POINTS", config: { pointsPerRupeePaise: 5 }, status: "ACTIVE" })
      )
    );
    exactlyOneWinner("RACE 4: 6 simultaneous ACTIVE POINTS creates → exactly 1 succeeds", results, [201], [409]);
    const list = await merchB.req("GET", "/api/merchant/program?businessId=" + bizBId);
    const activePoints = (list.data.programs ?? []).filter((p: any) => p.type === "POINTS" && p.status === "ACTIVE");
    check("RACE 4: exactly 1 ACTIVE POINTS program after the race", activePoints.length === 1, `active=${activePoints.length}`);
  }

  // ── EXPIRY (review round 2, issue 4): abandoned request stops blocking ───
  {
    const red = await custC.req("POST", `/api/wallet/${bizAId}/redeem`, { rewardId: rewardAId });
    check("EXPIRY setup: custC redemption created", [200, 201].includes(red.status), JSON.stringify(red.data).slice(0, 100));
    const redemptionId = red.data.redemption.id as string;

    // Simulate 25 hours passing — direct DB backdate (same write a real wait produces).
    await PDB.redemption.update({
      where: { id: redemptionId },
      data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    });

    // Merchant tries to approve the stale request → explicit 409 expired.
    const decide = await merchA.req("POST", `/api/merchant/redemptions/${redemptionId}/decide`, { decision: "APPROVED" });
    check("EXPIRY: approval of 24h-old request → 409 expired", decide.status === 409 && /expired/i.test(String(decide.data.error)), JSON.stringify(decide.data).slice(0, 120));

    // Wallet read sweeps the stale row → no longer blocking.
    const wallet = await custC.req("GET", `/api/wallet/${bizAId}`);
    check("EXPIRY: stale pending no longer returned as blocking", wallet.data.pendingRedemption === null, JSON.stringify(wallet.data.pendingRedemption ?? null).slice(0, 80));

    // perCustomerLimit=1 must NOT be consumed by the expired row → new redeem succeeds.
    const again = await custC.req("POST", `/api/wallet/${bizAId}/redeem`, { rewardId: rewardAId });
    check("EXPIRY: customer can redeem again after expiry (limit not consumed)", [200, 201].includes(again.status), JSON.stringify(again.data).slice(0, 100));

    // History shows the explicit EXPIRED transition.
    const history = await custC.req("GET", "/api/redemptions");
    const statuses = (history.data.redemptions ?? []).filter((r: any) => r.reward.id === rewardAId).map((r: any) => r.status);
    check("EXPIRY: history contains explicit EXPIRED status", statuses.includes("EXPIRED"), statuses.join(","));

    // Approve the fresh one so balances reconcile (custC: 100 setup + 50 RACE 3 − 1).
    const freshId = again.data.redemption?.id as string;
    const approve = await merchA.req("POST", `/api/merchant/redemptions/${freshId}/decide`, { decision: "APPROVED" });
    const wallet2 = await custC.req("GET", `/api/wallet/${bizAId}`);
    check("EXPIRY: fresh redemption approves and decrements once", approve.status === 200 && wallet2.data.account.points === 149, `points=${wallet2.data.account.points}`);
  }

  console.log(`\n== CONCURRENCY RESULT: ${PASS.length} passed, ${FAIL.length} failed ==`);
  if (FAIL.length) {
    console.log("FAILED:", FAIL);
    process.exitCode = 1;
  }
}

// ── Cleanup: remove every row this run created (cascades handle the rest) ────
let runBusinessIds: string[] = [];

async function cleanup(businessIds: string[]) {
  try {
    const users = await PDB.user.deleteMany({ where: { email: { contains: `@${EMAIL_DOMAIN}` } } });
    const otps = await PDB.otpCode.deleteMany({ where: { target: { contains: `@${EMAIL_DOMAIN}` } } });
    const audits = businessIds.length
      ? await PDB.auditLog.deleteMany({ where: { businessId: { in: businessIds } } })
      : { count: 0 };
    console.log(`cleanup: users=${users.count} otps=${otps.count} audits=${audits.count}`);
  } catch (err) {
    console.error("cleanup error (test rows may remain):", err);
  } finally {
    await PDB.$disconnect();
  }
}

main()
  .catch((err) => {
    console.error("SUITE ERROR:", err);
    process.exitCode = 1;
  })
  .finally(() => cleanup(runBusinessIds));
