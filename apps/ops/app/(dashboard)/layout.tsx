import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { ObservabilityUser } from "@/components/observability-user";
import { navCollapsedCookie, parseNavCollapsed } from "@/lib/nav-preferences";
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
  const navCollapsed = parseNavCollapsed(
    (await cookies()).get(navCollapsedCookie)?.value,
  );

  return (
    <>
      <ObservabilityUser userId={session.user.id} role={role} />
      <AppShell
        lowStockCount={lowStockCount}
        account={{
          name: session.user.name,
          email: session.user.email,
          role,
        }}
        defaultNavCollapsed={navCollapsed}
      >
        {children}
      </AppShell>
    </>
  );
}
