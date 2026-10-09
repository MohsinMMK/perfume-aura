/** Verify customer auth configuration only against disposable loopback PG. */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { requireDisposableTestDatabaseUrl } from "../../../packages/db/src/test-database-guard";

const testDatabaseUrl = requireDisposableTestDatabaseUrl(process.env.TEST_DATABASE_URL);
process.env.DATABASE_URL = testDatabaseUrl;
Object.assign(process.env, { NODE_ENV: "test" });
process.env.CUSTOMER_AUTH_URL = "http://localhost:3100";
process.env.STOREFRONT_URL = "http://localhost:3100";
process.env.CUSTOMER_AUTH_SECRET = "customer-auth-local-test-secret-at-least-thirty-two-characters";
delete process.env.CUSTOMER_GOOGLE_CLIENT_ID;
delete process.env.CUSTOMER_GOOGLE_CLIENT_SECRET;

describe("customer auth provider and session boundaries", { concurrency: false }, () => {
  let createCustomerAuth: typeof import("./customer-auth").createCustomerAuth;
  let pool: typeof import("@perfume-aura/db").pool;

  before(async () => {
    ({ createCustomerAuth } = await import("./customer-auth"));
    ({ pool } = await import("@perfume-aura/db"));
  });
  after(async () => { await pool.end(); });

  it("exposes neither Google nor One Tap with absent or partial credentials", async () => {
    for (const clientId of [undefined, "local-test-client-id"]) {
      if (clientId) process.env.CUSTOMER_GOOGLE_CLIENT_ID = clientId;
      else delete process.env.CUSTOMER_GOOGLE_CLIENT_ID;
      const auth = createCustomerAuth();
      const context = await auth.$context;
      assert.equal(context.socialProviders.length, 0);
      assert.equal(auth.options.plugins?.some((plugin) => plugin.id === "one-tap"), false);
      const response = await auth.handler(new Request(
        "http://localhost:3100/api/customer-auth/get-session",
      ));
      assert.equal(response.status, 200);
      assert.equal(await response.json(), null);
      assert.equal(response.headers.get("set-cookie"), null);
    }
  });

  it("configures Google and One Tap only with both credentials, preserving isolated auth", async () => {
    process.env.CUSTOMER_GOOGLE_CLIENT_ID = "local-test-client-id";
    process.env.CUSTOMER_GOOGLE_CLIENT_SECRET = "local-test-client-secret";
    const auth = createCustomerAuth();
    const context = await auth.$context;
    assert.deepEqual(context.socialProviders.map((provider) => provider.id), ["google"]);
    assert.equal(auth.options.plugins?.some((plugin) => plugin.id === "one-tap"), true);
    assert.equal(auth.options.basePath, "/api/customer-auth");
    assert.equal(auth.options.advanced?.cookiePrefix, "pa_customer");
    assert.equal(auth.options.advanced?.crossSubDomainCookies?.enabled, false);
    assert.equal(auth.options.account?.accountLinking?.disableImplicitLinking, true);
    assert.equal(auth.options.account?.accountLinking?.requireLocalEmailVerified, true);
    assert.equal(auth.options.plugins?.some((plugin) => ["magic-link", "oauth-proxy"].includes(plugin.id)), false);
  });
});
