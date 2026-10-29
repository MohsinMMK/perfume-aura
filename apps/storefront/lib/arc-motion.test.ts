import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { arcGeometry, arcItemOpacity, defaultArcStepDegrees } from "./arc-motion";

describe("arc geometry", () => {
  it("returns null instead of a zero step when the section has no width", () => {
    assert.equal(arcGeometry(0, 16, false), null);
    assert.equal(arcGeometry(Number.NaN, 16, false), null);
    assert.equal(arcGeometry(-320, 16, true), null);
    assert.equal(arcGeometry(Number.POSITIVE_INFINITY, 16, false), null);
  });

  it("keeps the desktop and mobile layout unchanged for measurable widths", () => {
    const desktop = arcGeometry(1440, 16, false);
    assert.ok(desktop);
    assert.equal(desktop.itemWidth, 448);
    assert.equal(desktop.radius, 1368);
    assert.ok(Math.abs(desktop.stepDegrees - ((448 * 1.3) / 1368) * (180 / Math.PI)) < 1e-9);

    const mobile = arcGeometry(390, 16, true);
    assert.ok(mobile);
    assert.ok(Math.abs(mobile.itemWidth - 390 * 0.82) < 1e-9);
    assert.ok(Math.abs(mobile.radius - 390 * 1.7) < 1e-9);
    assert.ok(mobile.stepDegrees > 0);
  });

  it("falls back to a 16px rem when the root font size is unreadable", () => {
    assert.deepEqual(arcGeometry(1440, Number.NaN, false), arcGeometry(1440, 16, false));
    assert.deepEqual(arcGeometry(1440, 0, false), arcGeometry(1440, 16, false));
  });
});

describe("arc item opacity", () => {
  it("is fully opaque at the centred step and fades to the floor", () => {
    assert.equal(arcItemOpacity(0, 0, 24), 1);
    assert.equal(arcItemOpacity(1, -24, 24), 1);
    assert.ok(Math.abs(arcItemOpacity(1, 0, 24) - 0.28) < 1e-9);
    assert.equal(arcItemOpacity(3, 0, 24), 0.16);
  });

  it("stays finite when the step or rotation is degenerate", () => {
    // 0/0 used to yield NaN here; gsap.utils.clamp then returned a function
    // and `.toFixed` threw during the scroll update.
    for (const step of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const opacity = arcItemOpacity(0, 0, step);
      assert.ok(Number.isFinite(opacity));
      assert.equal(opacity.toFixed(3), "1.000");
    }
    assert.equal(arcItemOpacity(0, Number.NaN, defaultArcStepDegrees), 1);
    assert.ok(Number.isFinite(arcItemOpacity(2, Number.POSITIVE_INFINITY, 24)));
  });
});
