"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { identifyOpsUser, resetOpsPostHog } from "@/lib/posthog-client";

export function ObservabilityUser({
  userId,
  role,
}: Readonly<{ userId: string; role: string }>) {
  useEffect(() => {
    Sentry.setUser({ id: userId });
    Sentry.setTag("application", "operations");
    Sentry.setTag("role", role);
    void identifyOpsUser(userId, role).catch((error: unknown) => {
      Sentry.captureException(error, {
        tags: { application: "operations", integration: "posthog-identify" },
      });
    });
  }, [role, userId]);

  return null;
}

export async function resetOpsObservabilityUser(): Promise<void> {
  Sentry.setUser(null);
  await resetOpsPostHog();
}
