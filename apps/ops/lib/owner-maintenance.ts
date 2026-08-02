import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import {
  account,
  and,
  db,
  eq,
  opsAuditEvents,
  session,
  sql,
  twoFactor,
  user,
} from "@perfume-aura/db";
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
  OWNER_ROLE,
} from "./auth-policy";

const ownerInputSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z
    .string()
    .min(AUTH_PASSWORD_MIN_LENGTH)
    .max(AUTH_PASSWORD_MAX_LENGTH),
});

type OwnerInput = z.infer<typeof ownerInputSchema>;

type OwnerSeedResult = {
  userId: string;
  state: "created" | "repaired" | "unchanged";
};

type OwnerRecoveryResult = {
  userId: string;
  revokedSessionCount: number;
};

type OwnerTwoFactorResetResult = {
  revokedSessionCount: number;
  userId: string;
};

function normalizedOwnerInput(input: OwnerInput): OwnerInput {
  const parsed = ownerInputSchema.parse(input);
  return {
    email: parsed.email.toLowerCase(),
    password: parsed.password,
  };
}

async function lockOwnerIdentity(
  transaction: Parameters<
    Parameters<typeof db.transaction>[0]
  >[0],
) {
  await transaction.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${"perfume-aura:owner"}, 0))`,
  );
}

async function findUserByEmailForUpdate(
  transaction: Parameters<
    Parameters<typeof db.transaction>[0]
  >[0],
  normalizedEmail: string,
) {
  const rows = await transaction
    .select()
    .from(user)
    .where(sql`lower(${user.email}) = ${normalizedEmail}`)
    .for("update");

  if (rows.length > 1) {
    throw new Error(
      "Owner maintenance refused multiple case-insensitive user matches",
    );
  }

  return rows[0] ?? null;
}

async function findExistingOwnerForUpdate(
  transaction: Parameters<
    Parameters<typeof db.transaction>[0]
  >[0],
) {
  const owners = await transaction
    .select()
    .from(user)
    .where(eq(user.role, OWNER_ROLE))
    .for("update")
    .limit(2);

  if (owners.length > 1) {
    throw new Error("Owner maintenance found multiple owner identities");
  }

  return owners[0] ?? null;
}

async function findCredentialAccountsForUpdate(
  transaction: Parameters<
    Parameters<typeof db.transaction>[0]
  >[0],
  userId: string,
) {
  const rows = await transaction
    .select()
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        eq(account.providerId, "credential"),
      ),
    )
    .for("update");

  if (rows.length > 1) {
    throw new Error(
      "Owner maintenance refused multiple credential accounts",
    );
  }

  return rows[0] ?? null;
}

/**
 * Create or repair the one owner identity as one database transaction. A
 * transaction-scoped advisory lock serializes concurrent maintenance runs.
 */
export async function ensureOwnerAccount(
  input: OwnerInput,
): Promise<OwnerSeedResult> {
  const normalized = normalizedOwnerInput(input);
  const hashedPassword = await hashPassword(normalized.password);

  return db.transaction(async (transaction) => {
    await lockOwnerIdentity(transaction);

    let owner = await findUserByEmailForUpdate(
      transaction,
      normalized.email,
    );
    const existingOwner = await findExistingOwnerForUpdate(transaction);

    if (existingOwner && (!owner || existingOwner.id !== owner.id)) {
      throw new Error(
        "Owner maintenance refused to create or promote a second owner identity",
      );
    }

    let state: OwnerSeedResult["state"] = "unchanged";

    if (!owner) {
      const [created] = await transaction
        .insert(user)
        .values({
          id: randomUUID(),
          name: "Owner",
          email: normalized.email,
          emailVerified: true,
          role: OWNER_ROLE,
        })
        .returning();

      if (!created) {
        throw new Error("Owner user could not be created");
      }
      owner = created;
      state = "created";
    } else if (
      owner.role !== OWNER_ROLE ||
      !owner.emailVerified ||
      owner.email !== normalized.email
    ) {
      const [repaired] = await transaction
        .update(user)
        .set({
          email: normalized.email,
          emailVerified: true,
          role: OWNER_ROLE,
          updatedAt: new Date(),
        })
        .where(eq(user.id, owner.id))
        .returning();

      if (!repaired) {
        throw new Error("Owner user could not be repaired");
      }
      owner = repaired;
      state = "repaired";
    }

    const credential = await findCredentialAccountsForUpdate(
      transaction,
      owner.id,
    );

    if (!credential) {
      await transaction.insert(account).values({
        id: randomUUID(),
        accountId: owner.id,
        providerId: "credential",
        userId: owner.id,
        password: hashedPassword,
      });
      if (state === "unchanged") {
        state = "repaired";
      }
    } else if (!credential.password) {
      await transaction
        .update(account)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(account.id, credential.id));
      if (state === "unchanged") {
        state = "repaired";
      }
    }

    return {
      userId: owner.id,
      state,
    };
  });
}

/**
 * Break-glass credential recovery. The caller must enforce an explicit
 * operator confirmation. Password replacement and session revocation commit
 * atomically, leaving no mixed recovery state.
 */
export async function recoverOwnerCredential(
  input: OwnerInput,
): Promise<OwnerRecoveryResult> {
  const normalized = normalizedOwnerInput(input);
  const hashedPassword = await hashPassword(normalized.password);

  return db.transaction(async (transaction) => {
    await lockOwnerIdentity(transaction);

    const owner = await findUserByEmailForUpdate(
      transaction,
      normalized.email,
    );
    if (!owner || owner.role !== OWNER_ROLE) {
      throw new Error("Owner recovery target was not found");
    }

    const credential = await findCredentialAccountsForUpdate(
      transaction,
      owner.id,
    );

    if (credential) {
      await transaction
        .update(account)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(account.id, credential.id));
    } else {
      await transaction.insert(account).values({
        id: randomUUID(),
        accountId: owner.id,
        providerId: "credential",
        userId: owner.id,
        password: hashedPassword,
      });
    }

    const revokedSessions = await transaction
      .delete(session)
      .where(eq(session.userId, owner.id))
      .returning({ id: session.id });

    return {
      userId: owner.id,
      revokedSessionCount: revokedSessions.length,
    };
  });
}

/**
 * Separate, explicitly confirmed break-glass recovery for a lost owner TOTP
 * device. It never weakens an active session: every session is revoked and the
 * owner must sign in again to enroll a fresh authenticator.
 */
export async function resetOwnerTwoFactorBreakGlass(input: {
  email: string;
}): Promise<OwnerTwoFactorResetResult> {
  const email = z.string().trim().email().max(320).parse(input.email).toLowerCase();

  return db.transaction(async (transaction) => {
    await lockOwnerIdentity(transaction);
    const owner = await findUserByEmailForUpdate(transaction, email);
    if (!owner || owner.role !== OWNER_ROLE) {
      throw new Error("Owner two-factor recovery target was not found");
    }

    await transaction.delete(twoFactor).where(eq(twoFactor.userId, owner.id));
    await transaction
      .update(user)
      .set({ twoFactorEnabled: false, updatedAt: new Date() })
      .where(eq(user.id, owner.id));
    const revokedSessions = await transaction
      .delete(session)
      .where(eq(session.userId, owner.id))
      .returning({ id: session.id });
    await transaction.insert(opsAuditEvents).values({
      id: randomUUID(),
      actorUserId: owner.id,
      action: "owner.two_factor.break_glass_reset",
      targetType: "user",
      targetId: owner.id,
      metadata: { sessions_revoked: revokedSessions.length },
    });

    return {
      userId: owner.id,
      revokedSessionCount: revokedSessions.length,
    };
  });
}
