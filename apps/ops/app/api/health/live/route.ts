import { livenessResponse } from "@/lib/health";

export const dynamic = "force-dynamic";

export function GET() {
  return livenessResponse();
}
