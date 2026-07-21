import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

/** Ops root: send people to the app, not a static landing. */
export default async function Home() {
  const session = await getSession();
  redirect(session ? "/dashboard" : "/login");
}
