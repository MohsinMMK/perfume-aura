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
import { getFinanceSummary } from "@/lib/finance";
import { safeDbQuery } from "@/lib/db-safe";
import { formatPkr } from "@/lib/money";
import { DbUnavailableState } from "@/components/db-empty-state";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ days?: string }>;

export default async function FinancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const daysRaw = Number(sp.days ?? 30);
  const days = [7, 30, 90].includes(daysRaw) ? daysRaw : 30;

  const result = await safeDbQuery(() => getFinanceSummary(days));
  const s = result.data;

  const cards = s
    ? [
        {
          label: "Inventory cost",
          value: formatPkr(s.inventoryCostCents),
          hint: "On-hand × cost (live)",
          href: "/products",
        },
        {
          label: "Inventory retail",
          value: formatPkr(s.inventoryRetailCents),
          hint: "On-hand × retail (live)",
          href: "/products",
        },
        {
          label: "Open AR",
          value: formatPkr(s.openArCents),
          hint: "Issued unpaid balances",
          href: "/invoices/ar",
        },
        {
          label: "Revenue (issued)",
          value: formatPkr(s.revenueIssuedCents),
          hint: `Invoices issued last ${days}d`,
          href: "/invoices",
        },
        {
          label: "Cash collected",
          value: formatPkr(s.cashCollectedCents),
          hint: `Payments last ${days}d`,
          href: "/payments",
        },
        {
          label: "COGS (approx)",
          value: formatPkr(s.cogsApproxCents),
          hint: "Sales × current cost",
          href: "/stock",
        },
        {
          label: "Gross margin (approx)",
          value: formatPkr(s.grossMarginApproxCents),
          hint: "Revenue − COGS approx",
          href: "/finance",
        },
      ]
    : [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Finance
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signals from inventory, invoices, and payments — not a full ledger.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={d === 30 ? "/finance" : `/finance?days=${d}`}
              className={cn(
                buttonVariants({
                  variant: days === d ? "default" : "outline",
                  size: "sm",
                }),
              )}
            >
              {d}d
            </Link>
          ))}
        </div>
      </div>

      {result.error || !s ? (
        <DbUnavailableState message={result.error ?? "No data"} />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Period: {new Date(s.from).toLocaleDateString("en-PK")} →{" "}
            {new Date(s.to).toLocaleDateString("en-PK")} · COGS uses current
            unit cost (historical snapshot later).
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((c) => (
              <Link key={c.label} href={c.href} className="group">
                <Card className="h-full transition-colors group-hover:ring-foreground/20">
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div>
                      <CardDescription>{c.label}</CardDescription>
                      <CardTitle className="mt-1 text-2xl tabular-nums">
                        {c.value}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary">Live</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{c.hint}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
