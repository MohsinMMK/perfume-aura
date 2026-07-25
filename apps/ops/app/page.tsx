import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/session";

/** Ops root: send people to the app, not a static landing. */
export default async function Home() {
  const session = await getOwnerSession();
  redirect(session ? "/dashboard" : "/login");
}
