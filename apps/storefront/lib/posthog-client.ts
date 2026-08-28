import type { PostHog } from "posthog-js";
import { sanitizePostHogCapture } from "@/lib/observability";

let postHogPromise: Promise<PostHog | null> | null = null;

export type StorefrontAction = "open_instagram" | "open_whatsapp";
export type StorefrontActionSurface = "floating_action" | "mobile_menu";

export function createStorefrontActionProperties(
  surface: StorefrontActionSurface,
  action: StorefrontAction,
) {
  return { application: "storefront", surface, action } as const;
}

export function getStorefrontPostHog(): Promise<PostHog | null> {
  if (postHogPromise) return postHogPromise;

  const projectToken =
    process.env.NEXT_PUBLIC_STOREFRONT_POSTHOG_TOKEN?.trim();
  if (!projectToken) return Promise.resolve(null);

  postHogPromise = import("posthog-js").then(({ default: posthog }) => {
    if (!posthog.__loaded) {
      posthog.init(projectToken, {
        api_host:
          process.env.NEXT_PUBLIC_STOREFRONT_POSTHOG_HOST?.trim() ||
          "https://us.i.posthog.com",
        defaults: "2026-05-30",
        autocapture: false,
        capture_pageview: "history_change",
        capture_pageleave: true,
        disable_session_recording: true,
        disable_surveys: true,
        disable_web_experiments: true,
        disable_external_dependency_loading: true,
        advanced_disable_feature_flags: true,
        person_profiles: "identified_only",
        persistence: "sessionStorage",
        cross_subdomain_cookie: false,
        respect_dnt: true,
        before_send: sanitizePostHogCapture,
      });
      posthog.register({ application: "storefront" });
    }
    return posthog;
  });

  return postHogPromise;
}

export async function resetStorefrontPostHog(): Promise<void> {
  const posthog = await getStorefrontPostHog();
  posthog?.reset();
}

export function captureStorefrontAction(
  surface: StorefrontActionSurface,
  action: StorefrontAction,
): void {
  void getStorefrontPostHog().then((posthog) => {
    posthog?.capture(
      "storefront_contact_action",
      createStorefrontActionProperties(surface, action),
    );
  });
}
