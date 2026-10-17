import { z } from "zod";
import { ApiErr } from "@/lib/auth-helpers";

// ─── Regexes & normalizers ────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const PINCODE_RE = /^[1-9]\d{5}$/;

/** Normalizes an Indian mobile: strips spaces/dashes, +91 / 91 / 0 prefixes → bare 10 digits. */
export function normalizePhone(raw: string): string {
  return raw
    .replace(/[\s()\-]/g, "")
    .replace(/^\+91/, "")
    .replace(/^91(?=[6-9]\d{9}$)/, "")
    .replace(/^0(?=[6-9]\d{9})/, "");
}

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

export function isIndianMobile(value: string): boolean {
  return PHONE_RE.test(value);
}

// ─── Enums ────────────────────────────────────────────────────────────────────

export const CATEGORIES = [
  "CAFE",
  "RESTAURANT",
  "SALON",
  "BAKERY",
  "SUPERMARKET",
  "RETAIL",
  "GYM",
  "LAUNDRY",
  "OTHER",
] as const;

export const PROGRAM_TYPES = [
  "POINTS",
  "STAMPS",
  "SERVICE_COUNT",
  "STARS",
  "SPEND",
  "CUSTOM_OFFER",
] as const;

export type ProgramType = (typeof PROGRAM_TYPES)[number];

export const CHANNELS = ["EMAIL", "SMS"] as const;
export const ROLES = ["CUSTOMER", "MERCHANT_OWNER"] as const;

// ─── Auth schemas ─────────────────────────────────────────────────────────────

const targetSchema = z.string().trim().min(3, "Enter your email or mobile number.").max(320);

function refineTargetByChannel(
  val: { channel: "EMAIL" | "SMS"; target: string },
  ctx: z.RefinementCtx
): void {
  if (val.channel === "EMAIL") {
    if (!isEmail(val.target.toLowerCase())) {
      ctx.addIssue({ code: "custom", path: ["target"], message: "Enter a valid email address." });
    }
  } else if (!isIndianMobile(normalizePhone(val.target))) {
    ctx.addIssue({
      code: "custom",
      path: ["target"],
      message: "Enter a valid 10-digit Indian mobile number.",
    });
  }
}

export const otpRequestSchema = z
  .object({
    channel: z.enum(CHANNELS),
    target: targetSchema,
    intent: z.enum(["LOGIN", "REGISTER"]).default("LOGIN"),
    role: z.enum(ROLES).optional(),
  })
  .superRefine(refineTargetByChannel);

export const otpVerifySchema = z
  .object({
    channel: z.enum(CHANNELS),
    target: targetSchema,
    code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
    role: z.enum(ROLES).optional(),
    // Optional intent echo from the auth screen (defaults to LOGIN: no account is
    // created by accident; REGISTER creates one when none exists).
    intent: z.enum(["LOGIN", "REGISTER"]).default("LOGIN"),
  })
  .superRefine(refineTargetByChannel);

// ─── Program config per type (server is the authority) ───────────────────────

const pointsConfigSchema = z.object({
  pointsPerRupeePaise: z
    .number({ message: "pointsPerRupeePaise is required" })
    .int("pointsPerRupeePaise must be a whole number")
    .min(1, "pointsPerRupeePaise must be at least 1")
    .max(100, "pointsPerRupeePaise can be at most 100"),
});

const stampsConfigSchema = z.object({
  stampsPerVisit: z.literal(1, { message: "stampsPerVisit must be 1" }),
  stampsToReward: z
    .number({ message: "stampsToReward is required" })
    .int()
    .min(2, "stampsToReward must be at least 2")
    .max(50, "stampsToReward can be at most 50"),
});

const serviceCountConfigSchema = z.object({
  servicesToReward: z
    .number({ message: "servicesToReward is required" })
    .int()
    .min(2, "servicesToReward must be at least 2")
    .max(50, "servicesToReward can be at most 50"),
});

const starsConfigSchema = z.object({
  starsPerVisit: z
    .number({ message: "starsPerVisit is required" })
    .int()
    .min(1, "starsPerVisit must be at least 1")
    .max(5, "starsPerVisit can be at most 5"),
  starsToReward: z
    .number({ message: "starsToReward is required" })
    .int()
    .min(2, "starsToReward must be at least 2")
    .max(100, "starsToReward can be at most 100"),
});

const spendConfigSchema = z.object({
  spendPaiseToReward: z
    .number({ message: "spendPaiseToReward is required" })
    .int()
    .min(10000, "spendPaiseToReward must be at least ₹100 (10000 paise)"),
});

const customOfferConfigSchema = z.object({
  offerText: z
    .string({ message: "offerText is required" })
    .trim()
    .min(5, "offerText must be at least 5 characters")
    .max(280, "offerText can be at most 280 characters"),
});

/**
 * Validates a program config object against its type. Throws ApiErr(400) with a
 * helpful message. Returns the normalized config object.
 */
export function parseProgramConfig(type: string, config: unknown): Record<string, unknown> {
  if (config === undefined || config === null || typeof config !== "object" || Array.isArray(config)) {
    throw new ApiErr(400, "Program configuration must be an object.");
  }
  const fail = (message: string): never => {
    throw new ApiErr(400, message);
  };
  switch (type) {
    case "POINTS": {
      const res = pointsConfigSchema.safeParse(config);
      return res.success ? res.data : fail(`Invalid POINTS config: ${res.error.issues[0]?.message ?? "check the fields"}`);
    }
    case "STAMPS": {
      const res = stampsConfigSchema.safeParse(config);
      return res.success ? res.data : fail(`Invalid STAMPS config: ${res.error.issues[0]?.message ?? "check the fields"}`);
    }
    case "SERVICE_COUNT": {
      const res = serviceCountConfigSchema.safeParse(config);
      return res.success ? res.data : fail(`Invalid SERVICE_COUNT config: ${res.error.issues[0]?.message ?? "check the fields"}`);
    }
    case "STARS": {
      const res = starsConfigSchema.safeParse(config);
      return res.success ? res.data : fail(`Invalid STARS config: ${res.error.issues[0]?.message ?? "check the fields"}`);
    }
    case "SPEND": {
      const res = spendConfigSchema.safeParse(config);
      return res.success ? res.data : fail(`Invalid SPEND config: ${res.error.issues[0]?.message ?? "check the fields"}`);
    }
    case "CUSTOM_OFFER": {
      const res = customOfferConfigSchema.safeParse(config);
      return res.success ? res.data : fail(`Invalid CUSTOM_OFFER config: ${res.error.issues[0]?.message ?? "check the fields"}`);
    }
    default:
      return fail("Unknown program type.");
  }
}

// ─── Program schemas ──────────────────────────────────────────────────────────

const isoDate = z.coerce.date().optional().nullable();

export const programCreateSchema = z.object({
  businessId: z.string().min(1, "businessId is required"),
  name: z.string().trim().min(2, "Program name must be at least 2 characters").max(80),
  type: z.enum(PROGRAM_TYPES),
  // Config itself validated per type in parseProgramConfig (route layer).
  config: z.unknown(),
  terms: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED"]).default("DRAFT"),
  startsAt: isoDate,
  endsAt: isoDate,
  perCustomerLimit: z.number().int().min(1).max(10000).optional().nullable(),
  minSpendPaise: z.number().int().min(0).max(100000000).optional().nullable(),
});

export const programUpdateSchema = z.object({
  id: z.string().min(1, "Program id is required"),
  name: z.string().trim().min(2).max(80).optional(),
  type: z.enum(PROGRAM_TYPES).optional(),
  config: z.unknown().optional(),
  terms: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED"]).optional(),
  startsAt: isoDate,
  endsAt: isoDate,
  perCustomerLimit: z.number().int().min(1).max(10000).optional().nullable(),
  minSpendPaise: z.number().int().min(0).max(100000000).optional().nullable(),
});

// ─── Business / outlet schemas ────────────────────────────────────────────────

const businessFields = {
  name: z.string().trim().min(2, "Business name must be at least 2 characters").max(100),
  category: z.enum(CATEGORIES, { message: "Choose a valid business category." }),
  description: z.string().trim().max(500).optional().nullable(),
  addressLine: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  state: z.string().trim().max(80).optional().nullable(),
  pincode: z
    .string()
    .trim()
    .regex(PINCODE_RE, "Enter a valid 6-digit Indian pincode.")
    .optional()
    .nullable(),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || isIndianMobile(normalizePhone(v)), "Enter a valid 10-digit Indian mobile number.")
    .optional()
    .nullable(),
  logoUrl: z.string().trim().max(500).optional().nullable(),
  coverUrl: z.string().trim().max(500).optional().nullable(),
};

export const businessCreateSchema = z.object(businessFields);
export const businessUpdateSchema = z.object({ id: z.string().min(1, "Business id is required"), ...businessFields });

export const outletCreateSchema = z.object({
  businessId: z.string().min(1).optional(),
  name: z.string().trim().min(2, "Outlet name must be at least 2 characters").max(100),
  addressLine: z.string().trim().max(200).optional().nullable(),
});

// ─── Reward schemas ───────────────────────────────────────────────────────────

const rewardFields = {
  title: z.string().trim().min(2, "Reward title must be at least 2 characters").max(100),
  description: z.string().trim().max(300).optional().nullable(),
  cost: z
    .number({ message: "cost is required" })
    .int("cost must be a whole number")
    .min(1, "cost must be at least 1")
    .max(1000000, "cost is too large"),
  unit: z.enum(["POINTS", "STAMPS"], { message: "unit must be POINTS or STAMPS" }),
  terms: z.string().trim().max(500).optional().nullable(),
};

export const rewardCreateSchema = z.object({
  programId: z.string().min(1, "programId is required"),
  active: z.boolean().optional(),
  ...rewardFields,
});

export const rewardUpdateSchema = z.object({
  id: z.string().min(1, "Reward id is required"),
  title: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(300).optional().nullable(),
  cost: z.number().int().min(1).max(1000000).optional(),
  unit: z.enum(["POINTS", "STAMPS"]).optional(),
  active: z.boolean().optional(),
  terms: z.string().trim().max(500).optional().nullable(),
});

// ─── QR transaction schemas ───────────────────────────────────────────────────

export const txnCreateSchema = z.object({
  outletId: z.string().min(1, "outletId is required"),
  amountPaise: z
    .number({ message: "amountPaise is required" })
    .int("Amount must be a whole number of paise")
    .min(1000, "Minimum transaction amount is ₹10")
    .max(10000000, "Maximum transaction amount is ₹1,00,000"),
  note: z.string().trim().max(140).optional().nullable(),
});

// ─── Redemption schemas ───────────────────────────────────────────────────────

export const redeemSchema = z.object({
  rewardId: z.string().min(1, "rewardId is required"),
});

export const decideSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"], { message: "decision must be APPROVED or REJECTED" }),
});

// ─── Feedback ─────────────────────────────────────────────────────────────────

export const feedbackSchema = z.object({
  businessId: z.string().min(1, "businessId is required"),
  rating: z
    .number({ message: "rating is required" })
    .int()
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  comment: z.string().trim().max(500).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(30)).max(5, "At most 5 tags").optional(),
});

// ─── Query schemas ────────────────────────────────────────────────────────────

export const businessesQuerySchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  q: z.string().trim().max(80).optional(),
});

export const merchantRedemptionsQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
});

export const txnsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Body/query parsing helpers ───────────────────────────────────────────────

export async function parseBody<T extends z.ZodType>(schema: T, req: Request): Promise<z.output<T>> {
  let raw: unknown = {};
  try {
    raw = await req.json();
  } catch {
    raw = {};
  }
  const parsed = schema.safeParse(raw ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue && issue.path.length > 0 ? issue.path.join(".") : "Input";
    throw new ApiErr(400, issue ? `${field}: ${issue.message}` : "Invalid input.");
  }
  return parsed.data;
}

export function parseQuery<T extends z.ZodType>(schema: T, req: Request): z.output<T> {
  const obj: Record<string, string> = {};
  const url = new URL(req.url);
  url.searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  const parsed = schema.safeParse(obj);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue && issue.path.length > 0 ? issue.path.join(".") : "Query";
    throw new ApiErr(400, issue ? `${field}: ${issue.message}` : "Invalid query.");
  }
  return parsed.data;
}
