import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/session";
import { getDashboardStats } from "@/lib/stock";
import { safeDbQuery } from "@/lib/db-safe";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const stats = await safeDbQuery(() => getDashboardStats());
  const lowStockCount = stats.data?.lowStockCount ?? 0;

  return <AppShell lowStockCount={lowStockCount}>{children}</AppShell>;
}
