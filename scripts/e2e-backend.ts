export {};

/** Reward Jar backend E2E smoke test (sandbox). Run: bun scripts/e2e-backend.ts */
const B = "http://localhost:3000";
const PASS: string[] = [];
const FAIL: string[] = [];

type Jar = Map<string, string>;

function client(): { req: (method: string, path: string, body?: unknown) => Promise<{ status: number; data: any }> } {
  const jar = new Map<string, string>();
  const spoofIp = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  return {
    async req(method, path, body) {
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
      try { data = await res.json(); } catch {}
      return { status: res.status, data };
    },
  };
}

function check(name: string, cond: boolean, detail = "") {
  (cond ? PASS : FAIL).push(name);
  console.log((cond ? "PASS " : "FAIL ") + name + (detail ? "  | " + detail : ""));
}

async function register(c: ReturnType<typeof client>, target: string, role: string) {
  const r1 = await c.req("POST", "/api/auth/otp/request", { channel: "EMAIL", target, intent: "REGISTER", role });
  if (!r1.data.devCode) throw new Error("otp request failed: " + JSON.stringify(r1.data));
  const r2 = await c.req("POST", "/api/auth/otp/verify", { channel: "EMAIL", target, code: r1.data.devCode, intent: "REGISTER", role });
  if (r2.status !== 200 || !r2.data.user) throw new Error("verify failed: " + JSON.stringify(r2.data));
  return r2.data.user;
}

const ts = Date.now();
const cust = client(), merch1 = client(), merch2 = client();

// 1. Customer registers
const u = await register(cust, `c${ts}@t.in`, "CUSTOMER");
check("customer register + session", u.role === "CUSTOMER");

// 2. Merchant onboards
await register(merch1, `m${ts}@t.in`, "MERCHANT_OWNER");
const bizRes = await merch1.req("POST", "/api/merchant/business", { name: "E2E Salon", category: "SALON", city: "Noida", addressLine: "A-1" });
check("merchant business created", bizRes.status === 201 && !!bizRes.data.business?.id, JSON.stringify(bizRes.data).slice(0, 120));
const bizId = bizRes.data.business.id;
const outletId = bizRes.data.business.outlets[0].id;
const outletCode = bizRes.data.business.outlets[0].code;

// 3. Programs
const p1 = await merch1.req("POST", "/api/merchant/program", { businessId: bizId, name: "5 visits", type: "STAMPS", config: { stampsPerVisit: 1, stampsToReward: 5 }, status: "ACTIVE" });
check("STAMPS program created", [200, 201].includes(p1.status), JSON.stringify(p1.data).slice(0, 120));
const progId = (p1.data.program ?? p1.data).id;
const r1 = await merch1.req("POST", "/api/merchant/rewards", { programId: progId, title: "Free haircut", cost: 5, unit: "STAMPS" });
check("reward created", [200, 201].includes(r1.status), JSON.stringify(r1.data).slice(0, 120));
const r1b = await merch1.req("POST", "/api/merchant/rewards", { programId: progId, title: "Small tea on us", cost: 1, unit: "STAMPS" });
check("cost-1 reward created", [200, 201].includes(r1b.status));
const p2 = await merch1.req("POST", "/api/merchant/program", { businessId: bizId, name: "Spend", type: "POINTS", config: { pointsPerRupeePaise: 10 }, status: "ACTIVE" });
check("POINTS program created", [200, 201].includes(p2.status));
const p3 = await merch1.req("POST", "/api/merchant/program", { businessId: bizId, name: "Dup", type: "POINTS", config: { pointsPerRupeePaise: 5 }, status: "ACTIVE" });
check("duplicate ACTIVE POINTS program → 409", p3.status === 409, String(p3.status));

// 4. Isolation: second merchant
await register(merch2, `m2${ts}@t.in`, "MERCHANT_OWNER");
const iso1 = await merch2.req("POST", "/api/merchant/rewards", { programId: progId, title: "Hack", cost: 1, unit: "STAMPS" });
check("merchant2 adding reward to merchant1 program → 403", iso1.status === 403, String(iso1.status));
const iso2 = await merch2.req("GET", "/api/merchant/analytics");
check("merchant2 analytics without business → 403", iso2.status === 403, String(iso2.status));

// 5. One-time txn QR
const t = await merch1.req("POST", "/api/merchant/qr/txn", { outletId, amountPaise: 50000 });
check("txn QR created (₹500)", t.status === 201 && !!t.data.token, JSON.stringify(t.data).slice(0, 120));
const token = t.data.token;
const prev = await cust.req("GET", `/api/qr/txn/${token}`);
check("customer previews txn", prev.status === 200 && prev.data.amountPaise === 50000);
const conf = await cust.req("POST", `/api/qr/txn/${token}/confirm`);
check("confirm awards 50 pts (10 per ₹100)", conf.data.pointsAwarded === 50 && conf.data.balance === 50, JSON.stringify(conf.data).slice(0, 160));
const replay = await cust.req("POST", `/api/qr/txn/${token}/confirm`);
check("REPLAY confirm → 409", replay.status === 409, String(replay.status));

// 6. Customer can't create QRs; bounds enforced
const hack = await cust.req("POST", "/api/merchant/qr/txn", { outletId, amountPaise: 999999 });
check("customer creating txn QR → 401/403", [401, 403].includes(hack.status), String(hack.status));
const lowAmt = await merch1.req("POST", "/api/merchant/qr/txn", { outletId, amountPaise: 999 });
check("amount below ₹10 rejected", lowAmt.status === 400, String(lowAmt.status));

// 7. Static visit + stamp cooldown
const v1 = await cust.req("POST", `/api/outlets/${outletCode}/visit`);
check("static visit awards 1 stamp", v1.data.stampsAwarded === 1 && v1.data.stamps === 1, JSON.stringify(v1.data).slice(0, 160));
const v2 = await cust.req("POST", `/api/outlets/${outletCode}/visit`);
check("cooldown visit → 0 stamps", v2.data.stampsAwarded === 0 && v2.data.stamps === 1, JSON.stringify(v2.data).slice(0, 120));

// 8. Wallet isolation
const w = await cust.req("GET", "/api/wallet");
const mine = (w.data.accounts ?? []).filter((a: any) => a.business.id === bizId);
check("wallet has exactly 1 account for this business", mine.length === 1, String((w.data.accounts ?? []).length));

// 9. Redemption lifecycle
const wd = await cust.req("GET", `/api/wallet/${bizId}`);
const cheapReward = wd.data.rewards.find((r: any) => r.cost === 1) ?? wd.data.rewards[0];
const rewardId = cheapReward.id;
const red = await cust.req("POST", `/api/wallet/${bizId}/redeem`, { rewardId });
check("redemption created PENDING", [200, 201].includes(red.status) && red.data.redemption?.status === "PENDING", JSON.stringify(red.data).slice(0, 120));
const redId = red.data.redemption?.id;
const wd2 = await cust.req("GET", `/api/wallet/${bizId}`);
check("balance unchanged before approval", wd2.data.account.stamps === 1);
const dec = await merch1.req("POST", `/api/merchant/redemptions/${redId}/decide`, { decision: "APPROVED" });
check("merchant approves", dec.status === 200 && dec.data.redemption?.status === "APPROVED", JSON.stringify(dec.data).slice(0, 120));
const wd3 = await cust.req("GET", `/api/wallet/${bizId}`);
check("stamps decremented to 0", wd3.data.account.stamps === 0);
const dec2 = await merch1.req("POST", `/api/merchant/redemptions/${redId}/decide`, { decision: "APPROVED" });
check("double approve → 409", dec2.status === 409, String(dec2.status));

// 10. Insufficient balance redeem
const red2 = await cust.req("POST", `/api/wallet/${bizId}/redeem`, { rewardId });
check("redeem with 0 balance → 400", red2.status === 400, String(red2.status));

// 11. OTP: LOGIN 404, REGISTER ok, reuse 400
const c2 = client();
const otp1 = await c2.req("POST", "/api/auth/otp/request", { channel: "EMAIL", target: `l${ts}@t.in`, intent: "LOGIN" });
const code = otp1.data.devCode;
const login404 = await c2.req("POST", "/api/auth/otp/verify", { channel: "EMAIL", target: `l${ts}@t.in`, code, intent: "LOGIN" });
check("LOGIN for non-existent account → 404", login404.status === 404, String(login404.status));
const regOk = await c2.req("POST", "/api/auth/otp/verify", { channel: "EMAIL", target: `l${ts}@t.in`, code, intent: "REGISTER" });
check("REGISTER with same code works", regOk.status === 200);
const reuse = await c2.req("POST", "/api/auth/otp/verify", { channel: "EMAIL", target: `l${ts}@t.in`, code, intent: "REGISTER" });
check("OTP code reuse → 400", reuse.status === 400, String(reuse.status));

// 12. Feedback + notifications
const fb = await cust.req("POST", "/api/feedback", { businessId: bizId, rating: 5, comment: "Great demo salon" });
check("feedback accepted", [200, 201].includes(fb.status), JSON.stringify(fb.data).slice(0, 120));
const fb2 = await cust.req("POST", "/api/feedback", { businessId: bizId, rating: 1 });
check("duplicate feedback within 24h blocked", [409, 429].includes(fb2.status), String(fb2.status));
const notif = await cust.req("GET", "/api/notifications");
check("notifications exist", notif.status === 200 && (notif.data.notifications ?? []).length >= 1, String((notif.data.notifications ?? []).length));

// 13. Analytics
const an = await merch1.req("GET", "/api/merchant/analytics");
check("analytics real aggregates", an.status === 200, JSON.stringify(an.data).slice(0, 200));

console.log(`\n== RESULT: ${PASS.length} passed, ${FAIL.length} failed ==`);
if (FAIL.length) { console.log("FAILED:", FAIL); process.exit(1); }
