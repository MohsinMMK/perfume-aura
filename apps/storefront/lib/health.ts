import { getEmbeddedBuildSourceCommit } from "./build-version";

const HEALTH_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json",
} as const;

export function versionResponse(
  readCommit: () => string = getEmbeddedBuildSourceCommit,
): Response {
  try {
    const commit = readCommit();
    return new Response(JSON.stringify({ status: "ok", commit }), {
      status: 200,
      headers: HEALTH_HEADERS,
    });
  } catch {
    console.error("[storefront/health/version] build identity unavailable");
    return new Response(JSON.stringify({ status: "unavailable" }), {
      status: 503,
      headers: HEALTH_HEADERS,
    });
  }
}
