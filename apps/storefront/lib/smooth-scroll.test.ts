import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPageScrollLocked } from "./smooth-scroll";

const html = (overflowY = "") => ({ style: { overflowY } });
const body = (overflowY = "", position = "") => ({ style: { overflowY, position } });

describe("smooth scroll lock detection", () => {
  it("hands wheel input back to the browser while a dialog locks the page", () => {
    assert.equal(isPageScrollLocked(html("hidden"), body()), true);
    assert.equal(isPageScrollLocked(html(), body("hidden")), true);
    assert.equal(isPageScrollLocked(html(), body("", "fixed")), true);
  });

  it("keeps smoothing an unlocked page", () => {
    assert.equal(isPageScrollLocked(html(), body()), false);
    assert.equal(isPageScrollLocked(html("auto"), body("visible", "static")), false);
  });
});
