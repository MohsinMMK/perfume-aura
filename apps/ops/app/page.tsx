import { redirect } from "next/navigation";
import { getOpsSession } from "@/lib/session";

/** Ops root: send people to the app, not a static landing. */
export default async function Home() {
  const session = await getOpsSession();
  redirect(session ? "/dashboard" : "/login");
}
