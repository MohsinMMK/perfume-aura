import * as Sentry from "@sentry/nextjs";
import { createStorefrontSentryOptions } from "@/lib/sentry-options";

Sentry.init(
  createStorefrontSentryOptions({
    dsn:
      process.env.STOREFRONT_SENTRY_DSN ??
      process.env.NEXT_PUBLIC_STOREFRONT_SENTRY_DSN,
    sampleRate:
      process.env.STOREFRONT_SENTRY_TRACES_SAMPLE_RATE ??
      process.env.NEXT_PUBLIC_STOREFRONT_SENTRY_TRACES_SAMPLE_RATE,
  }),
);
