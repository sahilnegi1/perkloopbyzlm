/**
 * Seed: ONE clearly-labeled demo business + demo customer with coherent history
 * so QR/wallet flows are testable immediately. Fully idempotent — safe to re-run.
 * Nothing here is presented as real on the landing page (isDemo=true, UI shows "Demo" badge).
 * Run: bun prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function seedBusiness() {
  const existing = await db.business.findFirst({ where: { isDemo: true } });
  if (existing) {
    console.log("Demo business already seeded:", existing.id);
    return existing;
  }

  const ownerEmail = "demo-merchant@perkloop.in";
  let owner = await db.user.findUnique({ where: { email: ownerEmail } });
  if (!owner) {
    owner = await db.user.create({
      data: {
        email: ownerEmail,
        name: "Demo Café Owner",
        role: "MERCHANT_OWNER",
      },
    });
  }

  const business = await db.business.create({
    data: {
      name: "Perk Loop Demo Café",
      category: "CAFE",
      description:
        "A demonstration café used to test Perk Loop end to end. Every number here is clearly labeled demo data.",
      addressLine: "Sector 18, Near Metro Station",
      city: "Noida",
      state: "Uttar Pradesh",
      pincode: "201301",
      phone: "9000000000",
      isDemo: true,
      members: { create: { userId: owner.id, role: "OWNER" } },
      outlets: {
        create: [{ name: "Demo Café — Sector 18", isPrimary: true }],
      },
    },
  });

  const stampsProgram = await db.loyaltyProgram.create({
    data: {
      businessId: business.id,
      name: "Punch Card — 5 visits, 1 free coffee",
      type: "STAMPS",
      config: JSON.stringify({ stampsPerVisit: 1, stampsToReward: 5 }),
      status: "ACTIVE",
      terms: "One stamp per visit. Free coffee on the 5th stamp. Demo program.",
    },
  });

  await db.reward.create({
    data: {
      businessId: business.id,
      programId: stampsProgram.id,
      title: "Free coffee",
      description: "Any regular coffee on the house.",
      cost: 5,
      unit: "STAMPS",
    },
  });

  const pointsProgram = await db.loyaltyProgram.create({
    data: {
      businessId: business.id,
      name: "Spend points — 10 pts per ₹100",
      type: "POINTS",
      config: JSON.stringify({ pointsPerRupeePaise: 10 }), // 10 points per 10000 paise
      status: "ACTIVE",
      terms: "10 points per ₹100 spent. Demo program.",
    },
  });

  await db.reward.create({
    data: {
      businessId: business.id,
      programId: pointsProgram.id,
      title: "₹50 off your bill",
      description: "Redeem 500 points for ₹50 off.",
      cost: 500,
      unit: "POINTS",
    },
  });

  console.log("Seeded demo business:", business.id);
  return business;
}

async function seedDemoCustomer(businessId: string) {
  const custEmail = "qa-customer@perkloop.in";
  const existingAccount = await db.loyaltyAccount.findFirst({
    where: { customer: { email: custEmail }, businessId },
  });
  if (existingAccount) {
    console.log("Demo customer already seeded:", custEmail);
    return;
  }

  let cust = await db.user.findUnique({ where: { email: custEmail } });
  if (!cust) {
    cust = await db.user.create({
      data: { email: custEmail, name: "Aarav", role: "CUSTOMER" },
    });
  }

  const outlet = await db.outlet.findFirst({ where: { businessId, isPrimary: true } });

  // 4 backdated visits over the past 4 days
  const visits = [];
  for (let i = 4; i >= 1; i--) {
    const at = new Date(Date.now() - i * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000);
    visits.push(
      await db.visit.create({
        data: {
          customerId: cust.id,
          businessId,
          outletId: outlet?.id,
          source: "STATIC_QR",
          createdAt: at,
        },
      })
    );
  }

  const acct = await db.loyaltyAccount.create({
    data: {
      customerId: cust.id,
      businessId,
      stamps: 4,
      points: 40,
      visitCount: 4,
      lastVisitAt: visits[visits.length - 1].createdAt,
    },
  });

  // Ledger: 4 stamp entries + one points earn (coherent history)
  for (let i = 0; i < 4; i++) {
    await db.ledgerEntry.create({
      data: {
        accountId: acct.id,
        businessId,
        type: "EARN_STAMP",
        unit: "STAMPS",
        delta: 1,
        balanceAfter: i + 1,
        description: "Visit stamp — Demo Café — Sector 18",
        refType: "VISIT",
        refId: visits[i].id,
        createdAt: visits[i].createdAt,
      },
    });
  }
  await db.ledgerEntry.create({
    data: {
      accountId: acct.id,
      businessId,
      type: "EARN_POINTS",
      unit: "POINTS",
      delta: 40,
      balanceAfter: 40,
      description: "10 pts per ₹100 — bill ₹400",
      refType: "TXN",
      createdAt: visits[3].createdAt,
    },
  });

  // Feed notifications matching the visits
  for (const v of visits) {
    await db.notification.create({
      data: {
        userId: cust.id,
        businessId,
        type: "REWARD_EARNED",
        title: "Stamp earned at Perk Loop Demo Café",
        body: "Your visit was recorded — 1 stamp added to your punch card.",
        createdAt: v.createdAt,
      },
    });
  }

  console.log("Seeded demo customer:", custEmail, "(4 visits, 4 stamps, 40 pts)");
}

async function main() {
  const business = await seedBusiness();
  await seedDemoCustomer(business.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
