import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  createCustomerAuthSecretResolver,
  isCustomerAuthEnabled,
  resolveCustomerAuthBaseUrl,
  resolveCustomerAuthTrustedOrigins,
} from "./customer-auth-policy";

describe("storefront customer-auth boundary", () => {
  it("uses only the storefront origin and a distinct customer secret", () => {
    const environment = {
      NODE_ENV: "production",
      CUSTOMER_AUTH_URL: "https://perfumeaura.com/api/customer-auth",
      STOREFRONT_URL: "https://perfumeaura.com",
      CUSTOMER_AUTH_SECRET: "customer-secret-that-is-distinct-and-long-enough",
    };
    assert.equal(resolveCustomerAuthBaseUrl(environment), "https://perfumeaura.com");
    assert.deepEqual(resolveCustomerAuthTrustedOrigins(environment), ["https://perfumeaura.com"]);
    assert.equal(createCustomerAuthSecretResolver()(environment), environment.CUSTOMER_AUTH_SECRET);
    assert.ok(!resolveCustomerAuthTrustedOrigins(environment).includes("https://app.perfumeaura.com"));
  });

  it("keeps customer authentication disabled unless explicitly released", () => {
    assert.equal(isCustomerAuthEnabled({}), false);
    assert.equal(
      isCustomerAuthEnabled({ STOREFRONT_CUSTOMER_AUTH_ENABLED: "false" }),
      false,
    );
    assert.equal(
      isCustomerAuthEnabled({ STOREFRONT_CUSTOMER_AUTH_ENABLED: "TRUE" }),
      false,
    );
    assert.equal(
      isCustomerAuthEnabled({ STOREFRONT_CUSTOMER_AUTH_ENABLED: "true" }),
      true,
    );
  });

  it("uses the apex during production builds", () => {
    assert.equal(
      resolveCustomerAuthBaseUrl({ NEXT_PHASE: "phase-production-build" }),
      "https://perfumeaura.com",
    );
  });

  it("does not load Better Auth or Neon before the release gate", async () => {
    const route = await readFile(
      new URL("../app/api/customer-auth/[...all]/route.ts", import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(route, /^import .*better-auth/m);
    assert.doesNotMatch(route, /^import .*@\/lib\/customer-auth["'];?$/m);
    assert.match(route, /if \(!isCustomerAuthEnabled\(\)\)/);
    assert.match(route, /import\("better-auth\/next-js"\)/);
    assert.match(route, /import\("@\/lib\/customer-auth"\)/);
    assert.ok(
      route.indexOf("if (!isCustomerAuthEnabled())") <
        route.indexOf("const nextHandlers = await handlers()"),
    );
  });

  it("defers the customer-auth browser SDK until an enabled user action", async () => {
    const accountForm = await readFile(
      new URL("../components/account-form.tsx", import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(accountForm, /^import .*customer-auth-client/m);
    assert.match(accountForm, /import\("@\/lib\/customer-auth-client"\)/);
  });

  it("avoids release-locked cart hydration and limits automatic prefetch", async () => {
    const shell = await readFile(
      new URL("../components/storefront-shell.tsx", import.meta.url),
      "utf8",
    );
    const cartProvider = await readFile(
      new URL("../components/cart-provider.tsx", import.meta.url),
      "utf8",
    );
    const header = await readFile(
      new URL("../components/site-header.tsx", import.meta.url),
      "utf8",
    );

    assert.match(shell, /initialCart=\{loadRemoteCart \? null : readReleaseLockedCart\(\)\}/);
    assert.match(cartProvider, /if \(!loadRemoteCart\) return/);
    assert.match(cartProvider, /controller\.abort\(\)/);
    assert.match(header, /prefetch=\{item\.href === "\/shop" \? null : false\}/);
  });

  it("defines a host-aware permanent apex redirect", async () => {
    const config = await readFile(
      new URL("../next.config.ts", import.meta.url),
      "utf8",
    );
    assert.match(config, /value:\s*"www\.perfumeaura\.com"/);
    assert.match(
      config,
      /destination:\s*"https:\/\/perfumeaura\.com\/:path\*"/,
    );
    assert.match(config, /permanent:\s*true/);
  });
});
