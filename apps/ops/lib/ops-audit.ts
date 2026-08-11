import { randomUUID } from "node:crypto";
import { db, opsAuditEvents, type OpsAuditMetadata } from "@perfume-aura/db";

type AuditScalar = string | number | boolean | null;

const SENSITIVE_METADATA_KEY =
  /(password|token|secret|credential|code|authorization|cookie|payload|url)/i;

/**
 * Audit records may identify an object and its outcome, never carry a raw form
 * body or any material that could grant access. Reject rather than silently
 * redact so a new call site must make an intentional, reviewable choice.
 */
export function safeAuditMetadata(
  metadata: Record<string, unknown> = {},
): OpsAuditMetadata {
  const safe: OpsAuditMetadata = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (
      key.length === 0 ||
      key.length > 64 ||
      SENSITIVE_METADATA_KEY.test(key) ||
      !/^[a-z][a-z0-9_]*$/i.test(key)
    ) {
      throw new Error("Unsafe operations audit metadata key");
    }

    if (
      value !== null &&
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      throw new Error("Operations audit metadata must be scalar");
    }
    if (
      (typeof value === "string" && value.length > 256) ||
      (typeof value === "number" && !Number.isFinite(value))
    ) {
      throw new Error("Operations audit metadata value is invalid");
    }

    safe[key] = value as AuditScalar;
  }

  return safe;
}

export async function appendOpsAuditEvent(input: {
  action: string;
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
  targetId?: string | null;
  targetType: string;
}): Promise<void> {
  await db.insert(opsAuditEvents).values({
    id: randomUUID(),
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    metadata: safeAuditMetadata(input.metadata),
  });
}
