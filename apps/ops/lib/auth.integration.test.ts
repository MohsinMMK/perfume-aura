/**
 * Better Auth and owner-maintenance integration against a guarded disposable
 * loopback PostgreSQL database. No dotenv files or provider services are used.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { verifyPassword } from "better-auth/crypto";
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
    let ensureOwnerAccount: typeof import("./owner-maintenance").ensureOwnerAccount;
    let recoverOwnerCredential: typeof import("./owner-maintenance").recoverOwnerCredential;
    let decideOwnerAuthorization: typeof import("./session").decideOwnerAuthorization;
    let and: typeof import("@perfume-aura/db").and;
    let eq: typeof import("@perfume-aura/db").eq;
    let inArray: typeof import("@perfume-aura/db").inArray;
    let like: typeof import("@perfume-aura/db").like;
    const resetDeliveries: Array<{ to: string; resetUrl: string }> = [];
    const userIds = new Set<string>();

    before(async () => {
      api = await import("@perfume-aura/db");
      ({ and, eq, inArray, like } = api);
      const authModule = await import("./auth");
      auth = authModule.createAuth({
        deliverPasswordResetEmail: async (mail) => {
          resetDeliveries.push(mail);
        },
      });
      ({ ensureOwnerAccount, recoverOwnerCredential } = await import(
        "./owner-maintenance"
      ));
      ({ decideOwnerAuthorization } = await import("./session"));
      await api.db.delete(api.rateLimit);
    });

    after(async () => {
      await api.pool
        .query("DROP TRIGGER IF EXISTS phase04_reject_session_delete ON session")
        .catch(() => undefined);
      await api.pool
        .query("DROP FUNCTION IF EXISTS phase04_reject_session_delete()")
        .catch(() => undefined);
      await api.db
        .delete(api.verification)
        .where(like(api.verification.identifier, `%${testPrefix}%`));
      if (userIds.size > 0) {
        await api.db
          .delete(api.verification)
          .where(inArray(api.verification.value, [...userIds]));
        await api.db
          .delete(api.user)
          .where(inArray(api.user.id, [...userIds]));
      }
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
      userIds.add(created.userId);
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
    });

    it("repairs a wrong role, unverified email, and missing credential atomically", async () => {
      const email = `${testPrefix}-repair@example.com`;
      const userId = randomUUID();
      userIds.add(userId);
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
      ambiguousUsers.forEach((id) => userIds.add(id));
      await api.db.insert(api.user).values([
        {
          id: ambiguousUsers[0],
          name: "Ambiguous A",
          email: ambiguousEmail,
          emailVerified: true,
          role: "owner",
        },
        {
          id: ambiguousUsers[1],
          name: "Ambiguous B",
          email: ambiguousEmail.toUpperCase(),
          emailVerified: true,
          role: "owner",
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
      userIds.add(duplicateCredentialUser);
      await api.db.insert(api.user).values({
        id: duplicateCredentialUser,
        name: "Duplicate credential owner",
        email: duplicateCredentialEmail,
        emailVerified: true,
        role: "owner",
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
      userIds.add(owner.userId);

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
      const owner = await ensureOwnerAccount({ email, password });
      userIds.add(owner.userId);

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

    it("denies non-owner and stale-cookie sessions with stable page/action decisions", async () => {
      const userEmail = `${testPrefix}-non-owner@example.com`;
      const userPassword = "Non owner session password 123";
      const seededUser = await ensureOwnerAccount({
        email: userEmail,
        password: userPassword,
      });
      userIds.add(seededUser.userId);
      await api.db
        .update(api.user)
        .set({ role: "user" })
        .where(eq(api.user.id, seededUser.userId));

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
      userIds.add(owner.userId);
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

      const expiredEmail = `${testPrefix}-expired-cookie@example.com`;
      const expiredPassword = "Expired cookie owner password 123";
      const expiredOwner = await ensureOwnerAccount({
        email: expiredEmail,
        password: expiredPassword,
      });
      userIds.add(expiredOwner.userId);
      const expiredSignIn = await auth.handler(
        postRequest("/sign-in/email", {
          email: expiredEmail,
          password: expiredPassword,
        }),
      );
      assert.equal(expiredSignIn.status, 200);
      const expiredCookie = sessionCookie(expiredSignIn);
      await api.db
        .update(api.session)
        .set({ expiresAt: new Date(Date.now() - 60_000) })
        .where(eq(api.session.userId, expiredOwner.userId));
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
      userIds.add(owner.userId);
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
      const owner = await ensureOwnerAccount({
        email: knownEmail,
        password: "Reset request owner password 123",
      });
      userIds.add(owner.userId);

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
