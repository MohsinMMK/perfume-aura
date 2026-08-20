import { createHmac } from "node:crypto";
import { isIP } from "node:net";

import { db, sql, storefrontRateLimit } from "@perfume-aura/db";

const maximumInquiryBodyBytes = 8 * 1024;

type InquirySecurityEnvironment = Record<string, string | undefined> & {
  STOREFRONT_INQUIRY_RATE_LIMIT_SECRET?: string;
  STOREFRONT_INQUIRY_TRUSTED_IP_HEADER?: string;
};

export function resolveInquiryRateLimitSecret(
  environment: InquirySecurityEnvironment = process.env,
): string {
  const secret = environment.STOREFRONT_INQUIRY_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Inquiry rate limiting requires a secret of at least 32 characters");
  }
  return secret;
}

export function inquiryRateLimitDigest(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

/**
 * Hostinger's forwarding header remains untrusted by default. Operators may
 * set one exact header name only after proving the edge removes any
 * client-supplied copy. Invalid or multi-address values are ignored.
 */
export function resolveTrustedInquiryIp(
  headers: Headers,
  environment: InquirySecurityEnvironment = process.env,
): string | null {
  const headerName = environment.STOREFRONT_INQUIRY_TRUSTED_IP_HEADER
    ?.trim()
    .toLowerCase();
  if (!headerName || !/^[a-z0-9-]{1,64}$/.test(headerName)) return null;
  const candidate = headers.get(headerName)?.trim();
  return candidate && !candidate.includes(",") && isIP(candidate) !== 0
    ? candidate
    : null;
}

export async function readBoundedInquiryJson(
  request: Request,
): Promise<unknown | null> {
  const contentLength = request.headers.get("content-length");
  if (
    contentLength &&
    (!/^\d+$/.test(contentLength) || Number(contentLength) > maximumInquiryBodyBytes)
  ) {
    return null;
  }
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maximumInquiryBodyBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
  } catch {
    return null;
  }
}

export async function claimInquiryRateLimit(input: Readonly<{
  key: string;
  limit: number;
  now?: Date;
  windowMilliseconds: number;
}>): Promise<boolean> {
  const now = input.now ?? new Date();
  const nowMilliseconds = now.getTime();
  if (
    !Number.isSafeInteger(nowMilliseconds) ||
    !Number.isSafeInteger(input.limit) ||
    input.limit < 1 ||
    !Number.isSafeInteger(input.windowMilliseconds) ||
    input.windowMilliseconds < 1
  ) {
    throw new Error("Inquiry rate-limit configuration is invalid");
  }
  const windowStart = nowMilliseconds - input.windowMilliseconds;
  const [claimed] = await db
    .insert(storefrontRateLimit)
    .values({
      id: input.key,
      key: input.key,
      count: 1,
      lastRequest: nowMilliseconds,
    })
    .onConflictDoUpdate({
      target: storefrontRateLimit.key,
      set: {
        count: sql<number>`CASE
          WHEN ${storefrontRateLimit.lastRequest} < ${windowStart} THEN 1
          ELSE ${storefrontRateLimit.count} + 1
        END`,
        lastRequest: nowMilliseconds,
      },
    })
    .returning({ count: storefrontRateLimit.count });
  return Boolean(claimed && claimed.count <= input.limit);
}
