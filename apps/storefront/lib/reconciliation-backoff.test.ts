import assert from "node:assert/strict";
import test from "node:test";
import { nextReconciliationSchedule } from "./reconciliation-backoff";

test("reconciliation backoff grows exponentially and caps at thirty minutes", () => {
  const now = new Date("2026-08-20T00:00:00.000Z");
  assert.deepEqual(nextReconciliationSchedule(now, 0), {
    attemptCount: 1,
    nextReconcileAt: new Date("2026-08-20T00:01:00.000Z"),
  });
  assert.deepEqual(nextReconciliationSchedule(now, 5), {
    attemptCount: 6,
    nextReconcileAt: new Date("2026-08-20T00:30:00.000Z"),
  });
  assert.deepEqual(nextReconciliationSchedule(now, 16), {
    attemptCount: 16,
    nextReconcileAt: new Date("2026-08-20T00:30:00.000Z"),
  });
});

test("reconciliation backoff rejects invalid inputs", () => {
  assert.throws(
    () => nextReconciliationSchedule(new Date("invalid"), 0),
    /time is invalid/,
  );
  assert.throws(
    () => nextReconciliationSchedule(new Date(), -1),
    /attempt count is invalid/,
  );
});
