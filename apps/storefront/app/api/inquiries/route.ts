import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, commerceInquiries, count, db, eq, gte } from "@perfume-aura/db";

const inquirySchema = z.object({
  kind: z.enum(["contact", "wholesale"]),
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(320),
  businessName: z.string().trim().max(240).nullish(),
  message: z.string().trim().min(10).max(5_000),
  website: z.string().max(0).optional(),
}).superRefine((value, context) => {
  if (value.kind === "wholesale" && !value.businessName) context.addIssue({ code: z.ZodIssueCode.custom, path: ["businessName"], message: "Business name is required." });
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const expectedOrigin = new URL(process.env.STOREFRONT_URL ?? "https://shop.perfumeaura.com").origin;
  if (process.env.STOREFRONT_INQUIRIES_ENABLED !== "true") return NextResponse.json({ error: "Inquiries are not enabled." }, { status: 503 });
  if (request.headers.get("origin") !== expectedOrigin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const consentVersion = process.env.STOREFRONT_INQUIRY_CONSENT_VERSION;
  if (!consentVersion) return NextResponse.json({ error: "Inquiry consent is not configured." }, { status: 503 });
  const parsed = inquirySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid inquiry." }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const [recent] = await db.select({ total: count(commerceInquiries.id) }).from(commerceInquiries).where(and(eq(commerceInquiries.email, email), gte(commerceInquiries.createdAt, new Date(Date.now() - 60 * 60 * 1_000))));
  if (Number(recent?.total ?? 0) >= 5) return NextResponse.json({ error: "Too many inquiries. Please try later." }, { status: 429 });
  await db.insert(commerceInquiries).values({ kind: parsed.data.kind, name: parsed.data.name, email, businessName: parsed.data.businessName || null, message: parsed.data.message, consentVersion });
  return NextResponse.json({ accepted: true }, { status: 201 });
}
