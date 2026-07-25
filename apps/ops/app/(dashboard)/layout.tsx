import { AppShell } from "@/components/app-shell";
import { requireOwnerSession } from "@/lib/session";
import { getLowStockCount } from "@/lib/stock";
import { safeDbQuery } from "@/lib/db-safe";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOwnerSession({ redirectToLogin: true });

  const lowStock = await safeDbQuery(() => getLowStockCount());
  const lowStockCount = lowStock.data ?? 0;

  return <AppShell lowStockCount={lowStockCount}>{children}</AppShell>;
}
