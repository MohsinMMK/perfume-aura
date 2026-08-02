"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  and,
  db,
  eq,
  sql,
  staffInvitationEvents,
  user,
} from "@perfume-aura/db";
import { actionError, actionOk, type ActionResult, zodFieldErrors } from "./action-result";
import { auth } from "./auth";
import { resolveAuthBaseUrl, STAFF_ROLE } from "./auth-policy";
import { appendOpsAuditEvent } from "./ops-audit";
import {
  areOpsStaffInvitesEnabled,
  isOpsTwoFactorRequired,
} from "./ops-security-policy";
import { appendStaffInvitationEvent } from "./staff-invitation-events";
import { requireCapability } from "./session";

const staffInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  name: z.string().trim().min(1).max(120),
});

const staffUserIdSchema = z.object({
  userId: z.string().uuid(),
});

export type StaffAccount = {
  banned: boolean;
  email: string;
  emailVerified: boolean;
  id: string;
  name: string;
};

async function findUserByEmail(email: string) {
  const matches = await db
    .select({
      banned: user.banned,
      email: user.email,
      emailVerified: user.emailVerified,
      id: user.id,
      name: user.name,
      role: user.role,
    })
    .from(user)
    .where(sql`lower(${user.email}) = ${email}`)
    .limit(2);

  if (matches.length > 1) {
    throw new Error("Staff invitation refused ambiguous email identity");
  }
  return matches[0] ?? null;
}

async function hasAcceptedInvitation(staffUserId: string): Promise<boolean> {
  const [accepted] = await db
    .select({ id: staffInvitationEvents.id })
    .from(staffInvitationEvents)
    .where(
      and(
        eq(staffInvitationEvents.staffUserId, staffUserId),
        eq(staffInvitationEvents.eventType, "accepted"),
      ),
    )
    .limit(1);
  return Boolean(accepted);
}

async function hasCreatedInvitation(staffUserId: string): Promise<boolean> {
  const [created] = await db
    .select({ id: staffInvitationEvents.id })
    .from(staffInvitationEvents)
    .where(
      and(
        eq(staffInvitationEvents.staffUserId, staffUserId),
        eq(staffInvitationEvents.eventType, "created"),
      ),
    )
    .limit(1);
  return Boolean(created);
}

/**
 * Creates one pending `staff` identity through Better Auth's official Admin
 * plugin, then sends its expiring password-setup link. The random bootstrap
 * credential exists only during this server call and is never persisted or
 * logged outside Better Auth's credential hash.
 */
export async function inviteStaffAction(
  raw: unknown,
): Promise<ActionResult<{ state: "created" | "resent" }>> {
  let ownerSession;
  try {
    ownerSession = await requireCapability("security.staff.manage");
  } catch {
    return actionError("Owner authorization is required");
  }

  if (!areOpsStaffInvitesEnabled()) {
    return actionError("Staff invitations are not enabled for this release");
  }
  if (!isOpsTwoFactorRequired()) {
    return actionError(
      "Mandatory two-factor authentication must be enabled before inviting staff",
    );
  }

  const parsed = staffInviteSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }

  const requestHeaders = await headers();
  const { email, name } = parsed.data;
  let staff = await findUserByEmail(email);
  let state: "created" | "resent" = "resent";

  try {
    if (!staff) {
      const created = await auth.api.createUser({
        headers: requestHeaders,
        body: {
          email,
          name,
          password: randomBytes(48).toString("base64url"),
          role: STAFF_ROLE,
        },
      });

      if (created.user.role !== STAFF_ROLE) {
        throw new Error("Better Auth did not create a staff identity");
      }

      staff = {
        banned: created.user.banned ?? false,
        email: created.user.email,
        emailVerified: created.user.emailVerified,
        id: created.user.id,
        name: created.user.name,
        role: created.user.role,
      };
      state = "created";
      await appendStaffInvitationEvent({
        actorUserId: ownerSession.user.id,
        email: staff.email,
        eventType: "created",
        metadata: { initial_invite: true },
        name: staff.name,
        staffUserId: staff.id,
      });
      await appendOpsAuditEvent({
        actorUserId: ownerSession.user.id,
        action: "staff.invitation.created",
        metadata: { initial_invite: true },
        targetId: staff.id,
        targetType: "user",
      });
    }

    if (!(await hasCreatedInvitation(staff.id))) {
      await appendStaffInvitationEvent({
        actorUserId: ownerSession.user.id,
        email: staff.email,
        eventType: "created",
        metadata: { recovered_invitation_record: true },
        name: staff.name,
        staffUserId: staff.id,
      });
    }

    if (
      staff.role !== STAFF_ROLE ||
      staff.banned ||
      (staff.emailVerified && (await hasAcceptedInvitation(staff.id)))
    ) {
      return actionError("This email already belongs to an active or protected identity");
    }

    await auth.api.requestPasswordReset({
      headers: requestHeaders,
      body: {
        email: staff.email,
        redirectTo: `${resolveAuthBaseUrl()}/reset-password`,
      },
    });
    await appendStaffInvitationEvent({
      actorUserId: ownerSession.user.id,
      email: staff.email,
      eventType: "delivered",
      metadata: { setup_link_requested: true },
      name: staff.name,
      staffUserId: staff.id,
    });
    await appendOpsAuditEvent({
      actorUserId: ownerSession.user.id,
      action:
        state === "created"
          ? "staff.invitation.delivery_requested"
          : "staff.invitation.resent",
      metadata: { setup_link_requested: true },
      targetId: staff.id,
      targetType: "user",
    });
  } catch (error) {
    console.error(
      "[staff invitation] delivery failed",
      error instanceof Error ? error.name : "unknown_error",
    );
    return actionError(
      "The staff invitation could not be sent. Check the configured mail delivery before retrying.",
    );
  }

  revalidatePath("/settings/staff");
  return actionOk({ state });
}

/**
 * Deactivation is a ban plus session revocation through Better Auth's official
 * Admin plugin. The action deliberately has no delete or role-change path.
 */
export async function deactivateStaffAction(
  raw: unknown,
): Promise<ActionResult> {
  let ownerSession;
  try {
    ownerSession = await requireCapability("security.staff.manage");
  } catch {
    return actionError("Owner authorization is required");
  }

  const parsed = staffUserIdSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Invalid staff account");
  }

  const [staff] = await db
    .select({
      email: user.email,
      id: user.id,
      name: user.name,
      role: user.role,
    })
    .from(user)
    .where(eq(user.id, parsed.data.userId))
    .limit(1);
  if (!staff || staff.role !== STAFF_ROLE || staff.id === ownerSession.user.id) {
    return actionError("Only a staff account can be deactivated");
  }

  try {
    const requestHeaders = await headers();
    await auth.api.banUser({
      headers: requestHeaders,
      body: {
        userId: staff.id,
        banReason: "Deactivated by Perfume Aura owner",
      },
    });
    await auth.api.revokeUserSessions({
      headers: requestHeaders,
      body: { userId: staff.id },
    });
    await appendStaffInvitationEvent({
      actorUserId: ownerSession.user.id,
      email: staff.email,
      eventType: "revoked",
      metadata: { sessions_revoked: true },
      name: staff.name,
      staffUserId: staff.id,
    });
    await appendOpsAuditEvent({
      actorUserId: ownerSession.user.id,
      action: "staff.deactivated",
      metadata: { sessions_revoked: true },
      targetId: staff.id,
      targetType: "user",
    });
  } catch (error) {
    console.error(
      "[staff deactivation] failed",
      error instanceof Error ? error.name : "unknown_error",
    );
    return actionError("The staff account could not be deactivated");
  }

  revalidatePath("/settings/staff");
  return actionOk();
}

export async function listStaffAccounts(): Promise<StaffAccount[]> {
  await requireCapability("security.staff.manage");
  return db
    .select({
      banned: user.banned,
      email: user.email,
      emailVerified: user.emailVerified,
      id: user.id,
      name: user.name,
    })
    .from(user)
    .where(eq(user.role, STAFF_ROLE));
}
