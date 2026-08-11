import * as Sentry from "@sentry/nextjs";
import { getOpsPostHog } from "@/lib/posthog-client";
import { createOpsSentryOptions } from "@/lib/sentry-options";

Sentry.init(
  createOpsSentryOptions({
    dsn: process.env.NEXT_PUBLIC_OPS_SENTRY_DSN,
    sampleRate: process.env.NEXT_PUBLIC_OPS_SENTRY_TRACES_SAMPLE_RATE,
  }),
);

function initializePostHogWhenIdle(): void {
  const initialize = () => {
    void getOpsPostHog().catch((error: unknown) => {
      Sentry.captureException(error, {
        tags: { application: "operations", integration: "posthog" },
      });
    });
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(initialize, { timeout: 2_000 });
    return;
  }
  globalThis.setTimeout(initialize, 0);
}

if (document.readyState === "complete") {
  initializePostHogWhenIdle();
} else {
  window.addEventListener("load", initializePostHogWhenIdle, { once: true });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
