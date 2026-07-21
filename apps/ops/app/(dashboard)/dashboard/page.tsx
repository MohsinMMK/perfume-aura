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
import { cn } from "@perfume-aura/ui/lib/utils";
import { getDashboardStats } from "@/lib/stock";
import { getOpenArTotalCents } from "@/lib/invoices";
import { safeDbQuery } from "@/lib/db-safe";
import { formatPkr, formatQty } from "@/lib/money";
import { DbUnavailableState } from "@/components/db-empty-state";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [result, arResult] = await Promise.all([
    safeDbQuery(() => getDashboardStats()),
    safeDbQuery(() => getOpenArTotalCents()),
  ]);

  const stats = result.data;
  const error = result.error ?? arResult.error;
  const openAr = arResult.data ?? 0;

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
    {
      label: "Inventory cost",
      value: stats ? formatPkr(stats.inventoryCostCents) : "—",
      hint: "Sum of qty × cost (PKR)",
      href: "/products",
      badge: error ? "Offline" : "Live",
      warn: false,
    },
    {
      label: "Open AR",
      value: formatPkr(openAr),
      hint: "Issued unpaid invoices",
      href: "/invoices/ar",
      badge: openAr > 0 ? "AR" : error ? "Offline" : "Clear",
      warn: openAr > 0,
    },
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
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
          <Link href="/products/new" className={cn(buttonVariants())}>
            New product
          </Link>
          <Link
            href="/stock"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Receive stock
          </Link>
          <Link
            href="/customers/new"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            New customer
          </Link>
          <Link
            href="/invoices/new"
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            New invoice
          </Link>
          <Link
            href="/stock/low"
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            Low stock
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
