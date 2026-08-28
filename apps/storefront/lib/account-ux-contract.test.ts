import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("customer account experience", () => {
  it("keeps sign-in familiar and removes internal release language", async () => {
    const accountForm = await readFile(
      new URL("../components/account-form.tsx", import.meta.url),
      "utf8",
    );

    assert.match(accountForm, /Continue with Google/u);
    assert.match(accountForm, /Forgot password\?/u);
    assert.match(accountForm, /Show password/u);
    assert.match(accountForm, /Use 12–256 characters/u);
    assert.match(accountForm, /Resend verification email/u);
    assert.match(accountForm, /If an eligible account exists/u);
    assert.doesNotMatch(accountForm, /production secret|callback domains|provider credentials/u);
    assert.doesNotMatch(accountForm, /^import .*customer-auth-client/mu);
  });

  it("preserves the requested destination between sign-in and registration", async () => {
    const [signInPage, registerPage] = await Promise.all([
      readFile(
        new URL("../app/account/sign-in/page.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../app/account/register/page.tsx", import.meta.url),
        "utf8",
      ),
    ]);

    assert.match(signInPage, /normalizeCustomerCallbackURL/u);
    assert.match(signInPage, /Sign in to continue checkout\. Your cart is saved\./u);
    assert.match(signInPage, /account\/register\?callbackURL=/u);
    assert.match(registerPage, /normalizeCustomerCallbackURL/u);
    assert.match(registerPage, /account\/sign-in\?callbackURL=/u);
  });

  it("uses a focused auth route without the storefront footer or WhatsApp action", async () => {
    const [routeChrome, shell] = await Promise.all([
      readFile(
        new URL("../components/storefront-route-chrome.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../components/storefront-shell.tsx", import.meta.url),
        "utf8",
      ),
    ]);

    assert.match(routeChrome, /\/account\/sign-in/u);
    assert.match(routeChrome, /\/account\/register/u);
    assert.match(routeChrome, /\/account\/recover/u);
    assert.match(routeChrome, /focusedAccountRoutes\.has\(pathname\) \? null : children/u);
    assert.match(shell, /<StorefrontRouteChrome>/u);
    assert.match(shell, /<SiteFooter \/>/u);
    assert.match(shell, /<WhatsAppContactAction \/>/u);
  });
});
