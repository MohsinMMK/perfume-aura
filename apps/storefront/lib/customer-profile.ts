import { z } from "zod";
import { db, eq, storefrontCustomerProfile } from "@perfume-aura/db";

function normalizeIndianPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  const nationalNumber = digits.startsWith("91") && digits.length === 12
    ? digits.slice(2)
    : digits;
  if (!/^[6-9][0-9]{9}$/.test(nationalNumber)) {
    throw new Error("Enter a valid Indian mobile number");
  }
  return `+91${nationalNumber}`;
}

export const deliveryProfileInputSchema = z.object({
  recipientName: z.string().trim().min(2).max(160),
  phone: z.string().trim().transform(normalizeIndianPhone),
  addressLine1: z.string().trim().min(5).max(240),
  addressLine2: z.string().trim().max(240).optional().default(""),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  postalCode: z.string().trim().regex(/^[1-9][0-9]{5}$/, "Enter a valid six-digit Indian PIN code"),
});

export type DeliveryProfileInput = z.infer<typeof deliveryProfileInputSchema>;

export async function getDeliveryProfile(userId: string): Promise<DeliveryProfileInput | null> {
  const [profile] = await db
    .select({
      recipientName: storefrontCustomerProfile.recipientName,
      phone: storefrontCustomerProfile.phone,
      addressLine1: storefrontCustomerProfile.addressLine1,
      addressLine2: storefrontCustomerProfile.addressLine2,
      city: storefrontCustomerProfile.city,
      state: storefrontCustomerProfile.state,
      postalCode: storefrontCustomerProfile.postalCode,
    })
    .from(storefrontCustomerProfile)
    .where(eq(storefrontCustomerProfile.userId, userId))
    .limit(1);
  return profile ? { ...profile, addressLine2: profile.addressLine2 ?? "" } : null;
}

export async function saveDeliveryProfile(
  userId: string,
  rawInput: unknown,
): Promise<DeliveryProfileInput> {
  const input = deliveryProfileInputSchema.parse(rawInput);
  await db
    .insert(storefrontCustomerProfile)
    .values({ userId, ...input, addressLine2: input.addressLine2 || null, country: "IN" })
    .onConflictDoUpdate({
      target: storefrontCustomerProfile.userId,
      set: { ...input, addressLine2: input.addressLine2 || null, country: "IN", updatedAt: new Date() },
    });
  return input;
}

export async function deleteDeliveryProfile(userId: string): Promise<void> {
  await db.delete(storefrontCustomerProfile).where(eq(storefrontCustomerProfile.userId, userId));
}
