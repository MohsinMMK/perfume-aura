import { db, sql } from "@perfume-aura/db";
import { getEmbeddedBuildSourceCommit } from "./build-version";

const HEALTH_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json",
} as const;

export function livenessResponse(): Response {
  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: HEALTH_HEADERS,
  });
}

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
    // Never log env values or malformed metadata contents.
    console.error("[health/version] build identity unavailable");
    return new Response(JSON.stringify({ status: "unavailable" }), {
      status: 503,
      headers: HEALTH_HEADERS,
    });
  }
}

export async function readinessResponse(
  probe: () => Promise<unknown> = () =>
    db.execute(sql`select 1`),
): Promise<Response> {
  try {
    await probe();
    return new Response(JSON.stringify({ status: "ready" }), {
      status: 200,
      headers: HEALTH_HEADERS,
    });
  } catch {
    // Never inspect or log error fields/causes: values may contain secrets.
    console.error("[health/ready] database probe failed");
    return new Response(JSON.stringify({ status: "unavailable" }), {
      status: 503,
      headers: HEALTH_HEADERS,
    });
  }
}
