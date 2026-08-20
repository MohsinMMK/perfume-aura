import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { commerceInquiries, db, inquiryNotificationOutbox } from "@perfume-aura/db";
import {
  claimInquiryRateLimit,
  inquiryRateLimitDigest,
  readBoundedInquiryJson,
  requireTrustedInquiryIp,
  resolveInquiryRateLimitSecret,
} from "@/lib/inquiry-security";

const inquirySchema = z.object({
  kind: z.enum(["contact", "wholesale"]),
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(320),
  businessName: z.string().trim().max(240).nullish(),
  message: z.string().trim().min(10).max(5_000),
  consentAccepted: z.literal(true),
  website: z.string().max(240).optional(),
}).superRefine((value, context) => {
  if (value.kind === "wholesale" && !value.businessName) context.addIssue({ code: z.ZodIssueCode.custom, path: ["businessName"], message: "Business name is required." });
});

const acceptedResponse = () =>
  NextResponse.json(
    { accepted: true },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );

export async function POST(request: NextRequest): Promise<NextResponse> {
  const expectedOrigin = new URL(process.env.STOREFRONT_URL ?? "https://perfumeaura.com").origin;
  if (process.env.STOREFRONT_INQUIRIES_ENABLED !== "true") return NextResponse.json({ error: "Inquiries are not enabled." }, { status: 503 });
  if (request.headers.get("origin") !== expectedOrigin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const consentVersion = process.env.STOREFRONT_INQUIRY_CONSENT_VERSION;
  if (!consentVersion) return NextResponse.json({ error: "Inquiry consent is not configured." }, { status: 503 });

  let rateLimitSecret: string;
  let trustedIp: string;
  try {
    rateLimitSecret = resolveInquiryRateLimitSecret();
    trustedIp = requireTrustedInquiryIp(request.headers);
  } catch {
    return NextResponse.json({ error: "Inquiries are temporarily unavailable." }, { status: 503 });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Inquiry could not be submitted." }, { status: 400 });
  }
  const parsed = inquirySchema.safeParse(await readBoundedInquiryJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Check the form and try again." }, { status: 400 });
  if (parsed.data.website) return acceptedResponse();

  const email = parsed.data.email.toLowerCase();
  const emailAllowed = await claimInquiryRateLimit({
    key: `inquiry:email:${inquiryRateLimitDigest(email, rateLimitSecret)}`,
    limit: 3,
    windowMilliseconds: 60 * 60 * 1_000,
  });
  const ipDigest = inquiryRateLimitDigest(trustedIp, rateLimitSecret);
  const [ipHourlyAllowed, ipDailyAllowed] = await Promise.all([
    claimInquiryRateLimit({
      key: `inquiry:ip-hour:${ipDigest}`,
      limit: 10,
      windowMilliseconds: 60 * 60 * 1_000,
    }),
    claimInquiryRateLimit({
      key: `inquiry:ip-day:${ipDigest}`,
      limit: 30,
      windowMilliseconds: 24 * 60 * 60 * 1_000,
    }),
  ]);
  if (!emailAllowed || !ipHourlyAllowed || !ipDailyAllowed) {
    return acceptedResponse();
  }

  await db.transaction(async (transaction) => {
    const [inquiry] = await transaction.insert(commerceInquiries).values({
      kind: parsed.data.kind,
      name: parsed.data.name,
      email,
      businessName: parsed.data.businessName || null,
      message: parsed.data.message,
      consentVersion,
    }).returning({ id: commerceInquiries.id });
    if (!inquiry) throw new Error("Inquiry could not be persisted");
    await transaction.insert(inquiryNotificationOutbox).values({
      inquiryId: inquiry.id,
      kind: "support_inquiry_received",
    });
  });
  return acceptedResponse();
}
