import { AppShell } from "@/components/app-shell";
import { ObservabilityUser } from "@/components/observability-user";
import { requireOwnerSession } from "@/lib/session";
import { getLowStockCount } from "@/lib/stock";
import { safeDbQuery } from "@/lib/db-safe";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireOwnerSession({ redirectToLogin: true });

  const lowStock = await safeDbQuery(() => getLowStockCount());
  const lowStockCount = lowStock.data ?? 0;

  return (
    <>
      <ObservabilityUser userId={session.user.id} role="owner" />
      <AppShell lowStockCount={lowStockCount}>{children}</AppShell>
    </>
  );
}
