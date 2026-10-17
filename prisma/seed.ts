/**
 * Seed: ONE clearly-labeled demo business so QR/wallet flows are testable immediately.
 * Nothing here is presented as real on the landing page (isDemo=true, UI shows "Demo" badge).
 * Run: bun prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const existing = await db.business.findFirst({ where: { isDemo: true } });
  if (existing) {
    console.log("Demo business already seeded:", existing.id);
    return;
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
