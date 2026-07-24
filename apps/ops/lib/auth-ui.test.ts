import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  signInErrorMessage,
  signInNetworkErrorMessage,
} from "./auth-ui";

describe("sign-in error presentation", () => {
  it("keeps credential errors generic", () => {
    assert.equal(
      signInErrorMessage({ status: 401, code: "INVALID_EMAIL_OR_PASSWORD" }),
      "Invalid email or password",
    );
    assert.equal(
      signInErrorMessage({ status: 400, message: "Invalid credentials" }),
      "Invalid email or password",
    );
  });

  it("identifies server, database, and network outages", () => {
    const expected =
      "Sign-in service is temporarily unavailable. Try again.";

    assert.equal(signInErrorMessage({ status: 500 }), expected);
    assert.equal(
      signInErrorMessage({ code: "SERVICE_UNAVAILABLE", status: 400 }),
      expected,
    );
    assert.equal(
      signInErrorMessage({ message: "TypeError: fetch failed" }),
      expected,
    );
    assert.equal(signInNetworkErrorMessage(), expected);
  });
});
