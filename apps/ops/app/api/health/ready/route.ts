import { readinessResponse } from "@/lib/health";

export const dynamic = "force-dynamic";

export async function GET() {
  return readinessResponse();
}
