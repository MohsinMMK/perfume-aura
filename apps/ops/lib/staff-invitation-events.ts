import { randomUUID } from "node:crypto";
import {
  and,
  db,
  eq,
  opsAuditEvents,
  staffInvitationEvents,
  user,
} from "@perfume-aura/db";
import { STAFF_ROLE } from "./auth-policy";
import { safeAuditMetadata } from "./ops-audit";

export type StaffInvitationEventType =
  | "created"
  | "delivered"
  | "accepted"
  | "revoked"
  | "expired";

export async function appendStaffInvitationEvent(input: {
  actorUserId?: string | null;
  email: string;
  eventType: Exclude<StaffInvitationEventType, "accepted">;
  metadata?: Record<string, unknown>;
  name: string;
  staffUserId: string;
}): Promise<void> {
  await db.insert(staffInvitationEvents).values({
    id: randomUUID(),
    actorUserId: input.actorUserId ?? null,
    staffUserId: input.staffUserId,
    eventType: input.eventType,
    email: input.email,
    name: input.name,
    metadata: safeAuditMetadata(input.metadata),
  });
}

/**
 * A successful password-reset link proves mailbox possession. The first such
 * reset for a pending staff identity verifies its email and writes immutable
 * invitation/audit events atomically.
 */
export async function markStaffInvitationAccepted(
  staffUserId: string,
): Promise<boolean> {
  return db.transaction(async (transaction) => {
    const [staff] = await transaction
      .select({
        email: user.email,
        name: user.name,
        role: user.role,
      })
      .from(user)
      .where(eq(user.id, staffUserId))
      .for("update")
      .limit(1);

    if (!staff || staff.role !== STAFF_ROLE) {
      return false;
    }

    await transaction
      .update(user)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(user.id, staffUserId));

    const [existingAcceptance] = await transaction
      .select({ id: staffInvitationEvents.id })
      .from(staffInvitationEvents)
      .where(
        and(
          eq(staffInvitationEvents.staffUserId, staffUserId),
          eq(staffInvitationEvents.eventType, "accepted"),
        ),
      )
      .limit(1);

    if (existingAcceptance) {
      return true;
    }

    await transaction.insert(staffInvitationEvents).values({
      id: randomUUID(),
      staffUserId,
      eventType: "accepted",
      email: staff.email,
      name: staff.name,
      metadata: { mailbox_verified: true },
    });
    await transaction.insert(opsAuditEvents).values({
      id: randomUUID(),
      action: "staff.invitation.accepted",
      targetType: "user",
      targetId: staffUserId,
      metadata: { mailbox_verified: true },
    });

    return true;
  });
}
