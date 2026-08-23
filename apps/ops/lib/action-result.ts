import type { ZodError } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function actionOk<T = undefined>(data?: T): ActionResult<T> {
  return data === undefined ? { ok: true } : { ok: true, data };
}

export function actionError(
  error: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

export function zodFieldErrors(
  error: ZodError,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const firstPathSegment = issue.path[0];
    if (
      typeof firstPathSegment !== "string" &&
      typeof firstPathSegment !== "number"
    ) {
      continue;
    }
    const key = String(firstPathSegment);
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
