import { db, sql } from "@perfume-aura/db";

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
    return new Response(JSON.stringify({ status: "unavailable" }), {
      status: 503,
      headers: HEALTH_HEADERS,
    });
  }
}
