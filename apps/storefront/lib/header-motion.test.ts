import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compactHeaderScrollY } from "./header-motion";

describe("compact header threshold", () => {
  it("switches desktop controls before the hero headline reaches the navigation", () => {
    assert.equal(compactHeaderScrollY(1099), 40);
    assert.equal(compactHeaderScrollY(1887), 40);
  });

  it("preserves the existing mobile threshold", () => {
    assert.equal(compactHeaderScrollY(390), 96);
    assert.equal(compactHeaderScrollY(639), 96);
  });
});
