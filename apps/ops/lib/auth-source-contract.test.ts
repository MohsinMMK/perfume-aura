import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const libDirectory = dirname(fileURLToPath(import.meta.url));
const appDirectory = resolve(libDirectory, "../app");

async function source(path: string): Promise<string> {
  return readFile(resolve(libDirectory, path), "utf8");
}

async function filesRecursively(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? filesRecursively(path) : [path];
    }),
  );
  return files.flat();
}

describe("Better Auth security source contract", () => {
  it("keeps sign-up disabled and uses durable endpoint-specific limits", async () => {
    const auth = await source("auth.ts");
    assert.match(auth, /disableSignUp:\s*true/);
    assert.match(auth, /storage:\s*"database"/);
    assert.match(auth, /modelName:\s*"rateLimit"/);
    assert.match(auth, /"\/sign-in\/email":\s*\{\s*window:\s*60,\s*max:\s*5/);
    assert.match(auth, /"\/request-password-reset":\s*\{\s*window:\s*60,\s*max:\s*3/);
    assert.match(auth, /revokeSessionsOnPasswordReset:\s*true/);
    assert.match(auth, /resetPasswordTokenExpiresIn/);
    assert.match(auth, /disableCSRFCheck:\s*false/);
    assert.match(auth, /disableOriginCheck:\s*false/);
    assert.match(auth, /crossSubDomainCookies:\s*\{\s*enabled:\s*false/);
  });

  it("uses same-origin client inference and keeps proxy authorization optimistic", async () => {
    const [client, proxy] = await Promise.all([
      source("auth-client.ts"),
      source("../proxy.ts"),
    ]);
    assert.doesNotMatch(client, /baseURL|NEXT_PUBLIC/);
    assert.match(client, /inferAdditionalFields<typeof auth>/);
    assert.doesNotMatch(proxy, /role|owner/);
  });

  it("does not trust query parameters as proof of a successful reset", async () => {
    const reset = await source(
      "../app/(auth)/reset-password/reset-password-form.tsx",
    );
    assert.doesNotMatch(reset, /searchParams\.get\(["']status["']\)/);
    assert.match(reset, /setSuccess\(true\)/);
    assert.match(reset, /if \(result\.error\)/);
  });

  it("keeps login rendering independent of auth/database availability", async () => {
    const page = await source("../app/(auth)/login/page.tsx");
    assert.doesNotMatch(page, /getSession|getOwnerSession|requireOwnerSession|@perfume-aura\/db/);
  });

  it("classifies a failed session fetch before treating a user as non-operations staff", async () => {
    const login = await source(
      "../app/(auth)/login/login-form.tsx",
    );
    const sessionFetch = login.indexOf(
      "const session = await authClient.getSession()",
    );
    const unavailable = login.indexOf(
      "if (session.error)",
      sessionFetch,
    );
    const roleCheck = login.indexOf(
      "if (!isProtectedOpsRole(session.data?.user.role))",
      sessionFetch,
    );

    assert.ok(sessionFetch >= 0);
    assert.ok(unavailable > sessionFetch);
    assert.ok(roleCheck > unavailable);
  });

  it("keeps owner-seed failures stable and redacted", async () => {
    const seed = await source("../scripts/seed-owner.ts");
    assert.match(
      seed,
      /Owner seed failed\. Review redacted server\/database diagnostics\./,
    );
    assert.doesNotMatch(seed, /console\.error\(\s*(err|error|cause)\b/);
  });

  it("requires an operations session in the protected shell and a capability in each protected page", async () => {
    const dashboardDirectory = resolve(appDirectory, "(dashboard)");
    const files = (await filesRecursively(dashboardDirectory)).filter(
      (file) => file.endsWith("/page.tsx") || file.endsWith("/layout.tsx"),
    );
    assert.ok(files.length > 0);

    for (const file of files) {
      const contents = await readFile(file, "utf8");
      if (file.endsWith("/layout.tsx")) {
        assert.match(
          contents,
          /await requireOpsSession\(\{\s*redirectToLogin:\s*true\s*\}\)/,
          `${file} must verify the protected operations session`,
        );
      } else {
        assert.match(
          contents,
          /await requireCapability\(/,
          `${file} must require a typed operations capability`,
        );
      }
    }
  });
});
