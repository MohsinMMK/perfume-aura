import { AppShell } from "@/components/app-shell";
import { requireOwnerSession } from "@/lib/session";
import { getDashboardStats } from "@/lib/stock";
import { safeDbQuery } from "@/lib/db-safe";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOwnerSession({ redirectToLogin: true });

  const stats = await safeDbQuery(() => getDashboardStats());
  const lowStockCount = stats.data?.lowStockCount ?? 0;

  return <AppShell lowStockCount={lowStockCount}>{children}</AppShell>;
}
