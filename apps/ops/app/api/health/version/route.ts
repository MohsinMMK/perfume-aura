import { versionResponse } from "@/lib/health";

export const dynamic = "force-dynamic";

export function GET() {
  return versionResponse();
}
