/**
 * Better Auth and owner-maintenance integration against a guarded disposable
 * loopback PostgreSQL database. No dotenv files or provider services are used.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, describe, it } from "node:test";
import { hashPassword, symmetricDecrypt, verifyPassword } from "better-auth/crypto";
import { requireDisposableTestDatabaseUrl } from "../../../packages/db/src/test-database-guard";

const testDatabaseUrl = requireDisposableTestDatabaseUrl(
  process.env.TEST_DATABASE_URL,
);
const baseUrl = "http://localhost:3000";
const testPrefix = `phase04-${Date.now()}-${randomUUID().slice(0, 8)}`;

process.env.DATABASE_URL = testDatabaseUrl;
process.env.BETTER_AUTH_SECRET =
  "phase04-local-test-secret-that-is-at-least-thirty-two-characters";
process.env.BETTER_AUTH_URL = baseUrl;
process.env.NODE_ENV = "test";

function postRequest(path: string, body: unknown): Request {
  return new Request(`${baseUrl}/api/auth${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: baseUrl,
      "x-forwarded-for": "127.0.0.1",
    },
    body: JSON.stringify(body),
  });
}

function sessionCookie(response: Response): string {
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "sign-in must set a session cookie");
  const firstCookie = setCookie.split(";")[0];
  assert.ok(firstCookie);
  return firstCookie;
}

describe(
  "Phase 04 Better Auth and owner maintenance",
  { concurrency: false },
  () => {
    let api: typeof import("@perfume-aura/db");
    let auth: typeof import("./auth").auth;
    let createAuth: typeof import("./auth").createAuth;
    let ensureOwnerAccount: typeof import("./owner-maintenance").ensureOwnerAccount;
    let recoverOwnerCredential: typeof import("./owner-maintenance").recoverOwnerCredential;
    let resetOwnerTwoFactorBreakGlass: typeof import("./owner-maintenance").resetOwnerTwoFactorBreakGlass;
    let appendStaffInvitationEvent: typeof import("./staff-invitation-events").appendStaffInvitationEvent;
    let markStaffInvitationAccepted: typeof import("./staff-invitation-events").markStaffInvitationAccepted;
    let decideOwnerAuthorization: typeof import("./session").decideOwnerAuthorization;
    let and: typeof import("@perfume-aura/db").and;
    let eq: typeof import("@perfume-aura/db").eq;
    let like: typeof import("@perfume-aura/db").like;
    const resetDeliveries: Array<{ to: string; resetUrl: string }> = [];

    async function clearTestIdentities(): Promise<void> {
      await api.pool.query("BEGIN");
      try {
        // The production trigger protects the final owner. This isolated test
        // cleanup deliberately bypasses it so every case begins with zero
        // identities and can prove one-owner creation independently.
        await api.pool.query("SET LOCAL session_replication_role = replica");
        await api.pool.query(
          `
            DELETE FROM ops_audit_events
            WHERE actor_user_id IN (SELECT id FROM "user" WHERE email LIKE $1)
               OR target_id IN (SELECT id FROM "user" WHERE email LIKE $1)
          `,
          [`${testPrefix}%`],
        );
        await api.pool.query(
          `
            DELETE FROM staff_invitation_events
            WHERE staff_user_id IN (SELECT id FROM "user" WHERE email LIKE $1)
               OR actor_user_id IN (SELECT id FROM "user" WHERE email LIKE $1)
          `,
          [`${testPrefix}%`],
        );
        await api.pool.query(
          `DELETE FROM two_factor WHERE user_id IN (SELECT id FROM "user" WHERE email LIKE $1)`,
          [`${testPrefix}%`],
        );
        await api.pool.query(
          `DELETE FROM session WHERE user_id IN (SELECT id FROM "user" WHERE email LIKE $1)`,
          [`${testPrefix}%`],
        );
        await api.pool.query(
          `DELETE FROM account WHERE user_id IN (SELECT id FROM "user" WHERE email LIKE $1)`,
          [`${testPrefix}%`],
        );
        await api.pool.query(
          'DELETE FROM "user" WHERE email LIKE $1',
          [`${testPrefix}%`],
        );
        await api.pool.query(
          "DELETE FROM verification WHERE identifier LIKE $1",
          [`%${testPrefix}%`],
        );
        await api.pool.query("DELETE FROM rate_limit");
        await api.pool.query("COMMIT");
      } catch (error) {
        await api.pool.query("ROLLBACK");
        throw error;
      }
      resetDeliveries.length = 0;
    }

    before(async () => {
      api = await import("@perfume-aura/db");
      ({ and, eq, like } = api);
      const authModule = await import("./auth");
      auth = authModule.createAuth({
        deliverPasswordResetEmail: async (mail) => {
          resetDeliveries.push(mail);
        },
      });
      createAuth = authModule.createAuth;
      ({ ensureOwnerAccount, recoverOwnerCredential, resetOwnerTwoFactorBreakGlass } = await import(
        "./owner-maintenance"
      ));
      ({ decideOwnerAuthorization } = await import("./session"));
      ({ appendStaffInvitationEvent, markStaffInvitationAccepted } = await import(
        "./staff-invitation-events"
      ));
      await api.db.delete(api.rateLimit);
    });

    beforeEach(async () => {
      await clearTestIdentities();
    });

    after(async () => {
      await api.pool
        .query("DROP TRIGGER IF EXISTS phase04_reject_session_delete ON session")
        .catch(() => undefined);
      await api.pool
        .query("DROP FUNCTION IF EXISTS phase04_reject_session_delete()")
        .catch(() => undefined);
      await clearTestIdentities();
      await api.db.delete(api.rateLimit);
      await api.pool.end();
    });

    async function credentialPassword(userId: string): Promise<string> {
      const [credential] = await api.db
        .select({ password: api.account.password })
        .from(api.account)
        .where(
          and(
            eq(api.account.userId, userId),
            eq(api.account.providerId, "credential"),
          ),
        )
        .limit(1);
      assert.ok(credential?.password);
      return credential.password;
    }

    it("creates one owner and repeated seed leaves the existing password unchanged", async () => {
      const email = `${testPrefix}-seed@example.com`;
      const originalPassword = "Original owner password 123";
      const ignoredPassword = "Ignored replacement password 456";

      const created = await ensureOwnerAccount({
        email,
        password: originalPassword,
      });
      assert.equal(created.state, "created");
      const originalHash = await credentialPassword(created.userId);

      const repeated = await ensureOwnerAccount({
        email: email.toUpperCase(),
        password: ignoredPassword,
      });
      assert.equal(repeated.state, "unchanged");
      assert.equal(repeated.userId, created.userId);

      const hashAfterRepeat = await credentialPassword(created.userId);
      assert.equal(hashAfterRepeat, originalHash);
      assert.equal(
        await verifyPassword({
          hash: hashAfterRepeat,
          password: originalPassword,
        }),
        true,
      );
      assert.equal(
        await verifyPassword({
          hash: hashAfterRepeat,
          password: ignoredPassword,
        }),
        false,
      );

      await assert.rejects(
        () =>
          ensureOwnerAccount({
            email: `${testPrefix}-second-owner@example.com`,
            password: "Second owner password 123",
          }),
        /second owner identity/,
      );

      const owners = await api.db
        .select({ id: api.user.id })
        .from(api.user)
        .where(eq(api.user.role, "owner"));
      assert.equal(owners.length, 1);
    });

    it("repairs a wrong role, unverified email, and missing credential atomically", async () => {
      const email = `${testPrefix}-repair@example.com`;
      const userId = randomUUID();
      await api.db.insert(api.user).values({
        id: userId,
        name: "Partial owner",
        email,
        emailVerified: false,
        role: "user",
      });

      const result = await ensureOwnerAccount({
        email,
        password: "Repair owner password 123",
      });
      assert.equal(result.state, "repaired");

      const [repaired] = await api.db
        .select()
        .from(api.user)
        .where(eq(api.user.id, userId));
      assert.equal(repaired?.role, "owner");
      assert.equal(repaired?.emailVerified, true);
      assert.ok(await credentialPassword(userId));
    });

    it("refuses ambiguous user and credential states", async () => {
      const ambiguousEmail = `${testPrefix}-ambiguous@example.com`;
      const ambiguousUsers = [randomUUID(), randomUUID()];
      await api.db.insert(api.user).values([
        {
          id: ambiguousUsers[0],
          name: "Ambiguous A",
          email: ambiguousEmail,
          emailVerified: true,
          role: "user",
        },
        {
          id: ambiguousUsers[1],
          name: "Ambiguous B",
          email: ambiguousEmail.toUpperCase(),
          emailVerified: true,
          role: "user",
        },
      ]);
      await assert.rejects(
        () =>
          ensureOwnerAccount({
            email: ambiguousEmail,
            password: "Ambiguous owner password 123",
          }),
        /multiple case-insensitive user matches/,
      );

      const duplicateCredentialEmail =
        `${testPrefix}-duplicate-credential@example.com`;
      const duplicateCredentialUser = randomUUID();
      await api.db.insert(api.user).values({
        id: duplicateCredentialUser,
        name: "Duplicate credential owner",
        email: duplicateCredentialEmail,
        emailVerified: true,
        role: "user",
      });
      await api.db.insert(api.account).values([
        {
          id: randomUUID(),
          accountId: duplicateCredentialUser,
          providerId: "credential",
          userId: duplicateCredentialUser,
          password: "first-placeholder",
        },
        {
          id: randomUUID(),
          accountId: duplicateCredentialUser,
          providerId: "credential",
          userId: duplicateCredentialUser,
          password: "second-placeholder",
        },
      ]);
      await assert.rejects(
        () =>
          ensureOwnerAccount({
            email: duplicateCredentialEmail,
            password: "Duplicate credential password 123",
          }),
        /multiple credential accounts/,
      );
    });

    it("rolls back failed break-glass recovery, then replaces the hash and revokes sessions", async () => {
      const email = `${testPrefix}-recovery@example.com`;
      const originalPassword = "Break glass original password 123";
      const replacementPassword = "Break glass replacement password 456";
      const owner = await ensureOwnerAccount({
        email,
        password: originalPassword,
      });

      await api.db.insert(api.session).values({
        id: randomUUID(),
        token: randomUUID(),
        userId: owner.userId,
        expiresAt: new Date(Date.now() + 60_000),
      });
      const originalHash = await credentialPassword(owner.userId);

      await api.pool.query(`
        CREATE FUNCTION phase04_reject_session_delete()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          RAISE EXCEPTION 'phase04 injected recovery failure';
        END;
        $$
      `);
      await api.pool.query(`
        CREATE TRIGGER phase04_reject_session_delete
        BEFORE DELETE ON session
        FOR EACH ROW
        EXECUTE FUNCTION phase04_reject_session_delete()
      `);

      await assert.rejects(() =>
        recoverOwnerCredential({
          email,
          password: replacementPassword,
        }),
      );
      assert.equal(await credentialPassword(owner.userId), originalHash);
      const sessionsAfterRollback = await api.db
        .select({ id: api.session.id })
        .from(api.session)
        .where(eq(api.session.userId, owner.userId));
      assert.equal(sessionsAfterRollback.length, 1);

      await api.pool.query(
        "DROP TRIGGER phase04_reject_session_delete ON session",
      );
      await api.pool.query("DROP FUNCTION phase04_reject_session_delete()");

      const recovered = await recoverOwnerCredential({
        email,
        password: replacementPassword,
      });
      assert.equal(recovered.revokedSessionCount, 1);
      const replacementHash = await credentialPassword(owner.userId);
      assert.notEqual(replacementHash, originalHash);
      assert.equal(
        await verifyPassword({
          hash: replacementHash,
          password: replacementPassword,
        }),
        true,
      );
      const sessionsAfterRecovery = await api.db
        .select({ id: api.session.id })
        .from(api.session)
        .where(eq(api.session.userId, owner.userId));
      assert.equal(sessionsAfterRecovery.length, 0);
    });

    it("disables public sign-up and returns the owner role in verified sessions", async () => {
      const signup = await auth.handler(
        postRequest("/sign-up/email", {
          name: "Forbidden signup",
          email: `${testPrefix}-signup@example.com`,
          password: "Forbidden signup password 123",
        }),
      );
      assert.equal(signup.status, 400);
      assert.match(await signup.text(), /EMAIL_PASSWORD_SIGN_UP_DISABLED/);

      const email = `${testPrefix}-session@example.com`;
      const password = "Session owner password 123";
      await ensureOwnerAccount({ email, password });

      const signIn = await auth.handler(
        postRequest("/sign-in/email", { email, password }),
      );
      assert.equal(signIn.status, 200);
      const signInBody = (await signIn.json()) as {
        user?: { role?: string };
      };
      assert.equal(signInBody.user?.role, "owner");

      const session = await auth.handler(
        new Request(`${baseUrl}/api/auth/get-session`, {
          headers: { cookie: sessionCookie(signIn) },
        }),
      );
      assert.equal(session.status, 200);
      const sessionBody = (await session.json()) as {
        user?: { role?: string };
      };
      assert.equal(sessionBody.user?.role, "owner");
    });

    it("keeps direct Better Auth admin mutations unavailable", async () => {
      for (const path of [
        "/admin/ban-user",
        "/admin/create-user",
        "/admin/remove-user",
        "/admin/revoke-user-sessions",
        "/admin/set-role",
        "/admin/unban-user",
      ]) {
        const response = await auth.handler(postRequest(path, {}));
        assert.equal(response.status, 404, `${path} must remain disabled`);
      }
    });

    it("removes direct 2FA disable when mandatory enrollment is enabled", async () => {
      const prior = process.env.OPS_TWO_FACTOR_REQUIRED;
      process.env.OPS_TWO_FACTOR_REQUIRED = "true";
      try {
        const enforcedAuth = createAuth({
          deliverPasswordResetEmail: async () => undefined,
        });
        const response = await enforcedAuth.handler(
          postRequest("/two-factor/disable", {}),
        );
        assert.equal(response.status, 404);
      } finally {
        if (prior === undefined) {
          delete process.env.OPS_TWO_FACTOR_REQUIRED;
        } else {
          process.env.OPS_TWO_FACTOR_REQUIRED = prior;
        }
      }
    });

    it("completes official TOTP enrollment without persisting recovery codes in application data", async () => {
      const email = `${testPrefix}-totp@example.com`;
      const password = "TOTP enrollment password 123";
      const owner = await ensureOwnerAccount({ email, password });

      const signIn = await auth.handler(
        postRequest("/sign-in/email", { email, password }),
      );
      assert.equal(signIn.status, 200);
      const cookie = sessionCookie(signIn);
      const enrollment = await auth.handler(
        new Request(`${baseUrl}/api/auth/two-factor/enable`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie,
            origin: baseUrl,
          },
          body: JSON.stringify({ password }),
        }),
      );
      assert.equal(enrollment.status, 200);
      const enrollmentBody = (await enrollment.json()) as {
        backupCodes?: string[];
        totpURI?: string;
      };
      assert.equal(enrollmentBody.backupCodes?.length, 10);
      assert.match(enrollmentBody.totpURI ?? "", /^otpauth:\/\/totp\//);

      const [factor] = await api.db
        .select({ secret: api.twoFactor.secret, verified: api.twoFactor.verified })
        .from(api.twoFactor)
        .where(eq(api.twoFactor.userId, owner.userId));
      assert.ok(factor?.secret);
      assert.equal(factor.verified, false);

      const secret = await symmetricDecrypt({
        key: process.env.BETTER_AUTH_SECRET as string,
        data: factor.secret,
      });
      const generated = await auth.api.generateTOTP({ body: { secret } });
      const verification = await auth.handler(
        new Request(`${baseUrl}/api/auth/two-factor/verify-totp`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie,
            origin: baseUrl,
          },
          body: JSON.stringify({ code: generated.code, trustDevice: true }),
        }),
      );
      assert.equal(verification.status, 200);

      const [verifiedUser] = await api.db
        .select({ enabled: api.user.twoFactorEnabled })
        .from(api.user)
        .where(eq(api.user.id, owner.userId));
      assert.equal(verifiedUser?.enabled, true);
      const [verifiedFactor] = await api.db
        .select({ verified: api.twoFactor.verified })
        .from(api.twoFactor)
        .where(eq(api.twoFactor.userId, owner.userId));
      assert.equal(verifiedFactor?.verified, true);
    });

    it("resets owner 2FA only through break-glass recovery and revokes every session", async () => {
      const email = `${testPrefix}-two-factor-recovery@example.com`;
      const owner = await ensureOwnerAccount({
        email,
        password: "Two factor recovery password 123",
      });
      await api.db
        .update(api.user)
        .set({ twoFactorEnabled: true })
        .where(eq(api.user.id, owner.userId));
      await api.db.insert(api.twoFactor).values({
        id: randomUUID(),
        userId: owner.userId,
        secret: "test-encrypted-secret",
        backupCodes: "test-encrypted-backup-codes",
        verified: true,
      });
      await api.db.insert(api.session).values({
        id: randomUUID(),
        token: randomUUID(),
        userId: owner.userId,
        expiresAt: new Date(Date.now() + 60_000),
      });

      const result = await resetOwnerTwoFactorBreakGlass({ email });
      assert.equal(result.userId, owner.userId);
      assert.equal(result.revokedSessionCount, 1);

      const [ownerAfterReset] = await api.db
        .select({ enabled: api.user.twoFactorEnabled })
        .from(api.user)
        .where(eq(api.user.id, owner.userId));
      assert.equal(ownerAfterReset?.enabled, false);
      const remainingFactors = await api.db
        .select({ id: api.twoFactor.id })
        .from(api.twoFactor)
        .where(eq(api.twoFactor.userId, owner.userId));
      assert.equal(remainingFactors.length, 0);
      const remainingSessions = await api.db
        .select({ id: api.session.id })
        .from(api.session)
        .where(eq(api.session.userId, owner.userId));
      assert.equal(remainingSessions.length, 0);
      const auditEvents = await api.db
        .select({ action: api.opsAuditEvents.action })
        .from(api.opsAuditEvents)
        .where(eq(api.opsAuditEvents.targetId, owner.userId));
      assert.deepEqual(auditEvents, [
        { action: "owner.two_factor.break_glass_reset" },
      ]);
    });

    it("marks a staff invitation accepted exactly once after mailbox-proven password setup", async () => {
      const staffId = randomUUID();
      const email = `${testPrefix}-staff-acceptance@example.com`;
      await api.db.insert(api.user).values({
        id: staffId,
        name: "Pending staff",
        email,
        emailVerified: false,
        role: "staff",
      });
      await appendStaffInvitationEvent({
        staffUserId: staffId,
        email,
        name: "Pending staff",
        eventType: "created",
        metadata: { initial_invite: true },
      });

      assert.equal(await markStaffInvitationAccepted(staffId), true);
      assert.equal(await markStaffInvitationAccepted(staffId), true);

      const [staff] = await api.db
        .select({ emailVerified: api.user.emailVerified })
        .from(api.user)
        .where(eq(api.user.id, staffId));
      assert.equal(staff?.emailVerified, true);
      const acceptedEvents = await api.db
        .select({ id: api.staffInvitationEvents.id })
        .from(api.staffInvitationEvents)
        .where(eq(api.staffInvitationEvents.eventType, "accepted"));
      assert.equal(acceptedEvents.length, 1);
      const acceptanceAudits = await api.db
        .select({ action: api.opsAuditEvents.action })
        .from(api.opsAuditEvents)
        .where(eq(api.opsAuditEvents.targetId, staffId));
      assert.deepEqual(acceptanceAudits, [
        { action: "staff.invitation.accepted" },
      ]);
    });

    it("denies non-owner and stale-cookie sessions with stable page/action decisions", async () => {
      const userEmail = `${testPrefix}-non-owner@example.com`;
      const userPassword = "Non owner session password 123";
      const userId = randomUUID();
      await api.db.insert(api.user).values({
        id: userId,
        name: "Non-owner user",
        email: userEmail,
        emailVerified: true,
        role: "user",
      });
      await api.db.insert(api.account).values({
        id: randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: await hashPassword(userPassword),
      });

      const userSignIn = await auth.handler(
        postRequest("/sign-in/email", {
          email: userEmail,
          password: userPassword,
        }),
      );
      assert.equal(userSignIn.status, 200);
      const userSessionResponse = await auth.handler(
        new Request(`${baseUrl}/api/auth/get-session`, {
          headers: { cookie: sessionCookie(userSignIn) },
        }),
      );
      const userSession = (await userSessionResponse.json()) as {
        user: { role?: string };
      } | null;
      assert.equal(userSession?.user.role, "user");
      assert.deepEqual(
        decideOwnerAuthorization(userSession, { redirectToLogin: true }),
        {
          kind: "redirect",
          location: "/login?error=access-denied",
        },
      );
      assert.deepEqual(decideOwnerAuthorization(userSession), {
        kind: "deny",
      });

      const ownerEmail = `${testPrefix}-stale-cookie@example.com`;
      const ownerPassword = "Stale cookie owner password 123";
      const owner = await ensureOwnerAccount({
        email: ownerEmail,
        password: ownerPassword,
      });
      const ownerSignIn = await auth.handler(
        postRequest("/sign-in/email", {
          email: ownerEmail,
          password: ownerPassword,
        }),
      );
      assert.equal(ownerSignIn.status, 200);
      const ownerCookie = sessionCookie(ownerSignIn);
      const ownerSessionResponse = await auth.handler(
        new Request(`${baseUrl}/api/auth/get-session`, {
          headers: { cookie: ownerCookie },
        }),
      );
      const ownerSession = (await ownerSessionResponse.json()) as {
        user: { role?: string };
      } | null;
      assert.equal(
        decideOwnerAuthorization(ownerSession, {
          redirectToLogin: true,
        }).kind,
        "allow",
      );

      await api.db
        .delete(api.session)
        .where(eq(api.session.userId, owner.userId));
      const deletedSessionResponse = await auth.handler(
        new Request(`${baseUrl}/api/auth/get-session`, {
          headers: { cookie: ownerCookie },
        }),
      );
      const deletedSession = (await deletedSessionResponse.json()) as {
        user: { role?: string };
      } | null;
      assert.equal(deletedSession, null);
      assert.deepEqual(
        decideOwnerAuthorization(deletedSession, {
          redirectToLogin: true,
        }),
        { kind: "redirect", location: "/login" },
      );
      assert.deepEqual(decideOwnerAuthorization(deletedSession), {
        kind: "deny",
      });

      const expiredSignIn = await auth.handler(
        postRequest("/sign-in/email", {
          email: ownerEmail,
          password: ownerPassword,
        }),
      );
      assert.equal(expiredSignIn.status, 200);
      const expiredCookie = sessionCookie(expiredSignIn);
      await api.db
        .update(api.session)
        .set({ expiresAt: new Date(Date.now() - 60_000) })
        .where(eq(api.session.userId, owner.userId));
      const expiredSessionResponse = await auth.handler(
        new Request(`${baseUrl}/api/auth/get-session`, {
          headers: { cookie: expiredCookie },
        }),
      );
      const expiredSession = (await expiredSessionResponse.json()) as {
        user: { role?: string };
      } | null;
      assert.equal(expiredSession, null);
      assert.deepEqual(
        decideOwnerAuthorization(expiredSession, {
          redirectToLogin: true,
        }),
        { kind: "redirect", location: "/login" },
      );
    });

    it("enforces reset policy, single-use expiry, and session revocation", async () => {
      const email = `${testPrefix}-reset@example.com`;
      const originalPassword = "Reset original password 123";
      const replacementPassword = "Reset replacement password 456";
      const owner = await ensureOwnerAccount({
        email,
        password: originalPassword,
      });
      await api.db.insert(api.session).values({
        id: randomUUID(),
        token: randomUUID(),
        userId: owner.userId,
        expiresAt: new Date(Date.now() + 60_000),
      });

      const token = `${testPrefix}-valid-token`;
      await api.db.insert(api.verification).values({
        id: randomUUID(),
        identifier: `reset-password:${token}`,
        value: owner.userId,
        expiresAt: new Date(Date.now() + 60_000),
      });

      const tooShort = await auth.handler(
        postRequest("/reset-password", {
          token,
          newPassword: "too-short",
        }),
      );
      assert.equal(tooShort.status, 400);

      const reset = await auth.handler(
        postRequest("/reset-password", {
          token,
          newPassword: replacementPassword,
        }),
      );
      assert.equal(reset.status, 200);
      const remainingSessions = await api.db
        .select({ id: api.session.id })
        .from(api.session)
        .where(eq(api.session.userId, owner.userId));
      assert.equal(remainingSessions.length, 0);

      const reused = await auth.handler(
        postRequest("/reset-password", {
          token,
          newPassword: "Another valid password 789",
        }),
      );
      assert.equal(reused.status, 400);

      const expiredToken = `${testPrefix}-expired-token`;
      await api.db.insert(api.verification).values({
        id: randomUUID(),
        identifier: `reset-password:${expiredToken}`,
        value: owner.userId,
        expiresAt: new Date(Date.now() - 60_000),
      });
      const expired = await auth.handler(
        postRequest("/reset-password", {
          token: expiredToken,
          newPassword: "Another valid password 789",
        }),
      );
      assert.equal(expired.status, 400);

      const credential = await credentialPassword(owner.userId);
      assert.equal(
        await verifyPassword({
          hash: credential,
          password: replacementPassword,
        }),
        true,
      );
    });

    it("returns identical generic reset responses for known and unknown accounts", async () => {
      const knownEmail = `${testPrefix}-reset-request-known@example.com`;
      await ensureOwnerAccount({
        email: knownEmail,
        password: "Reset request owner password 123",
      });

      const knownResponse = await auth.handler(
        postRequest("/request-password-reset", {
          email: knownEmail,
          redirectTo: `${baseUrl}/reset-password`,
        }),
      );
      const unknownResponse = await auth.handler(
        postRequest("/request-password-reset", {
          email: `${testPrefix}-missing@example.com`,
          redirectTo: `${baseUrl}/reset-password`,
        }),
      );
      const knownBody = await knownResponse.text();
      const unknownBody = await unknownResponse.text();

      assert.equal(knownResponse.status, 200);
      assert.equal(unknownResponse.status, knownResponse.status);
      assert.equal(unknownBody, knownBody);
      assert.match(knownBody, /If this email exists/);
      assert.doesNotMatch(knownBody, new RegExp(testPrefix));
      assert.equal(resetDeliveries.length, 1);
      assert.equal(resetDeliveries[0]?.to, knownEmail);
      assert.match(
        resetDeliveries[0]?.resetUrl ?? "",
        /^http:\/\/localhost:3000\/api\/auth\/reset-password\//,
      );
    });

    it("persists the stricter sign-in rate limit in rate_limit", async () => {
      await api.db.delete(api.rateLimit);
      const statuses: number[] = [];
      for (let attempt = 0; attempt < 7; attempt += 1) {
        const response = await auth.handler(
          postRequest("/sign-in/email", {
            email: `${testPrefix}-rate-limit@example.com`,
            password: "Wrong password 123",
          }),
        );
        statuses.push(response.status);
      }
      assert.equal(statuses.at(-1), 429);
      assert.ok(statuses.filter((status) => status !== 429).length <= 5);

      const persisted = await api.db
        .select()
        .from(api.rateLimit)
        .where(like(api.rateLimit.key, "%|/sign-in/email"));
      assert.ok(persisted.length > 0);
      assert.ok(persisted.some((entry) => entry.count >= 5));
    });
  },
);
