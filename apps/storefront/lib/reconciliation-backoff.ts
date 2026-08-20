const baseReconciliationDelayMilliseconds = 60_000;
const maximumReconciliationDelayMilliseconds = 30 * 60_000;
const maximumReconciliationAttemptCount = 16;

export function nextReconciliationSchedule(
  now: Date,
  currentAttemptCount: number,
): Readonly<{ attemptCount: number; nextReconcileAt: Date }> {
  if (Number.isNaN(now.getTime())) {
    throw new Error("Reconciliation time is invalid");
  }
  if (!Number.isInteger(currentAttemptCount) || currentAttemptCount < 0) {
    throw new Error("Reconciliation attempt count is invalid");
  }
  const attemptCount = Math.min(
    currentAttemptCount + 1,
    maximumReconciliationAttemptCount,
  );
  const delayMilliseconds = Math.min(
    baseReconciliationDelayMilliseconds * 2 ** (attemptCount - 1),
    maximumReconciliationDelayMilliseconds,
  );
  return {
    attemptCount,
    nextReconcileAt: new Date(now.getTime() + delayMilliseconds),
  };
}
