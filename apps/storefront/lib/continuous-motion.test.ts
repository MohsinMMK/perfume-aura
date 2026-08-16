import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldResumeContinuousMotion } from "./continuous-motion";

describe("continuous motion idle contract", () => {
  it("resumes only when the document is visible and the owner is idle", () => {
    assert.equal(
      shouldResumeContinuousMotion({
        hidden: false,
        hovered: false,
        focusWithin: false,
      }),
      true,
    );
  });

  it("stays paused for hover, keyboard focus, or a hidden document", () => {
    assert.equal(
      shouldResumeContinuousMotion({
        hidden: false,
        hovered: true,
        focusWithin: false,
      }),
      false,
    );
    assert.equal(
      shouldResumeContinuousMotion({
        hidden: false,
        hovered: false,
        focusWithin: true,
      }),
      false,
    );
    assert.equal(
      shouldResumeContinuousMotion({
        hidden: true,
        hovered: false,
        focusWithin: false,
      }),
      false,
    );
    assert.equal(
      shouldResumeContinuousMotion({
        hidden: true,
        hovered: true,
        focusWithin: true,
      }),
      false,
    );
  });
});
