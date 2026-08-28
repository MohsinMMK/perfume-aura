import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("operations sign-in surface", () => {
  it("clearly separates private operations from customer accounts", async () => {
    const [page, form] = await Promise.all([
      readFile(new URL("../app/(auth)/login/page.tsx", import.meta.url), "utf8"),
      readFile(
        new URL("../app/(auth)/login/login-form.tsx", import.meta.url),
        "utf8",
      ),
    ]);

    assert.match(page, /Perfume Aura Operations/u);
    assert.match(page, /Private access for the owner and invited staff/u);
    assert.match(page, /Customer accounts are managed separately/u);
    assert.doesNotMatch(page, /Create account|Register/u);
    assert.match(form, /Forgot password\?/u);
    assert.match(form, /Show password/u);
  });
});
