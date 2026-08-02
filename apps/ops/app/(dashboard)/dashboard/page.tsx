import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@perfume-aura/ui/components/card";
import { Badge } from "@perfume-aura/ui/components/badge";
import { buttonVariants } from "@perfume-aura/ui/components/button";
import { getDashboardStats } from "@/lib/stock";
import { getOpenArTotalCents } from "@/lib/invoices";
import { getCashCollectedThisMonthCents } from "@/lib/payments";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr, formatQty } from "@/lib/money";
import { DbUnavailableState } from "@/components/db-empty-state";
import { hasOpsCapability } from "@/lib/ops-access";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireCapability("dashboard.view", {
    redirectToLogin: true,
  });
  const canViewCost = hasOpsCapability(session.user.role, "stock.view-cost");
  const canViewFinance = hasOpsCapability(session.user.role, "finance.view");
  const canRecordPayments = hasOpsCapability(
    session.user.role,
    "payments.record",
  );
  const canManageCommercialCatalog = hasOpsCapability(
    session.user.role,
    "catalog.manage-commercials",
  );
  const canCreateCustomers = hasOpsCapability(
    session.user.role,
    "customers.create",
  );
  const canDraftInvoices = hasOpsCapability(session.user.role, "invoices.draft");
  const canReceiveStock = hasOpsCapability(session.user.role, "stock.receive");

  const [result, arResult, cashResult] = await Promise.all([
    safeDbQuery(() => getDashboardStats()),
    canViewFinance
      ? safeDbQuery(() => getOpenArTotalCents())
      : Promise.resolve({ data: null, error: null }),
    canRecordPayments
      ? safeDbQuery(() => getCashCollectedThisMonthCents())
      : Promise.resolve({ data: null, error: null }),
  ]);

  const stats = result.data;
  const error = result.error ?? arResult.error ?? cashResult.error;
  const openAr = arResult.data ?? 0;
  const cashMtd = cashResult.data ?? 0;

  const metrics = [
    {
      label: "Products",
      value: stats ? formatQty(stats.productCount) : "—",
      hint: "Active catalog products",
      href: "/products",
      badge: error ? "Offline" : "Live",
      warn: false,
    },
    {
      label: "On hand",
      value: stats ? formatQty(stats.totalUnits) : "—",
      hint: "Total units across active SKUs",
      href: "/stock",
      badge: error ? "Offline" : "Live",
      warn: false,
    },
    {
      label: "Low stock",
      value: stats ? formatQty(stats.lowStockCount) : "—",
      hint: "At or below reorder level",
      href: "/stock/low",
      badge:
        stats && stats.lowStockCount > 0
          ? "Attention"
          : error
            ? "Offline"
            : "OK",
      warn: Boolean(stats && stats.lowStockCount > 0),
    },
    ...(canViewCost
      ? [
          {
            label: "Inventory cost",
            value:
              stats?.inventoryCostCents === null
                ? "—"
                : formatInr(stats?.inventoryCostCents ?? 0),
            hint: "Sum of qty × cost (INR)",
            href: "/products",
            badge: error ? "Offline" : "Live",
            warn: false,
          },
        ]
      : []),
    ...(canViewFinance
      ? [
          {
            label: "Open AR",
            value: formatInr(openAr),
            hint: "Issued unpaid invoices",
            href: "/invoices/ar",
            badge: openAr > 0 ? "AR" : error ? "Offline" : "Clear",
            warn: openAr > 0,
          },
        ]
      : []),
    ...(canRecordPayments
      ? [
          {
            label: "Cash MTD",
            value: formatInr(cashMtd),
            hint: "Payments received this month",
            href: "/payments",
            badge: error ? "Offline" : "Live",
            warn: false,
          },
        ]
      : []),
  ] as const;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inventory and sales overview for Perfume Aura ops.
        </p>
      </div>

      {error ? <DbUnavailableState message={error} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {metrics.map((m) => (
          <Link key={m.label} href={m.href} className="group">
            <Card className="h-full transition-colors group-hover:ring-foreground/20">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardDescription>{m.label}</CardDescription>
                  <CardTitle className="mt-1 text-2xl tabular-nums">
                    {m.value}
                  </CardTitle>
                </div>
                <Badge variant={m.warn ? "destructive" : "secondary"}>
                  {m.badge}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{m.hint}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
          <CardDescription>
            Common inventory and sales tasks.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {canManageCommercialCatalog ? (
            <Link href="/products/new" className={buttonVariants()}>
              New product
            </Link>
          ) : null}
          {canReceiveStock ? (
            <Link
              href="/stock"
              className={buttonVariants({ variant: "outline" })}
            >
              Receive stock
            </Link>
          ) : null}
          {canCreateCustomers ? (
            <Link
              href="/customers/new"
              className={buttonVariants({ variant: "outline" })}
            >
              New customer
            </Link>
          ) : null}
          {canDraftInvoices ? (
            <Link
              href="/invoices/new"
              className={buttonVariants({ variant: "secondary" })}
            >
              New invoice
            </Link>
          ) : null}
          {canRecordPayments ? (
            <Link
              href="/payments"
              className={buttonVariants({ variant: "outline" })}
            >
              Payments
            </Link>
          ) : null}
          <Link
            href="/stock/low"
            className={buttonVariants({ variant: "secondary" })}
          >
            Low stock
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
