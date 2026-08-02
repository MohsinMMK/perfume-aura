import { AppShell } from "@/components/app-shell";
import { hasOpsCapability, parseOpsRole } from "@/lib/ops-access";
import { requireOpsSession } from "@/lib/session";
import { getLowStockCount } from "@/lib/stock";
import { safeDbQuery } from "@/lib/db-safe";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireOpsSession({ redirectToLogin: true });
  const role = parseOpsRole(session.user.role);
  if (!role) {
    throw new Error("Operations session unexpectedly has no valid role");
  }

  const lowStock = hasOpsCapability(role, "stock.view")
    ? await safeDbQuery(() => getLowStockCount())
    : { data: 0 };
  const lowStockCount = lowStock.data ?? 0;

  return (
    <AppShell lowStockCount={lowStockCount} role={role}>
      {children}
    </AppShell>
  );
}
