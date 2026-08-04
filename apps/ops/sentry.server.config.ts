import * as Sentry from "@sentry/nextjs";
import { createOpsSentryOptions } from "@/lib/sentry-options";

Sentry.init(
  createOpsSentryOptions({
    dsn: process.env.OPS_SENTRY_DSN ?? process.env.NEXT_PUBLIC_OPS_SENTRY_DSN,
    sampleRate:
      process.env.OPS_SENTRY_TRACES_SAMPLE_RATE ??
      process.env.NEXT_PUBLIC_OPS_SENTRY_TRACES_SAMPLE_RATE,
  }),
);
