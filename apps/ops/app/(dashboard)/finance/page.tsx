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
import { getFinanceSummary } from "@/lib/finance";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr } from "@/lib/money";
import { DbUnavailableState } from "@/components/db-empty-state";
import { formatBusinessDate } from "@/lib/business-date";
import { requireOwnerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ days?: string }>;

export default async function FinancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireOwnerSession({ redirectToLogin: true });
  const sp = await searchParams;
  const daysRaw = Number(sp.days ?? 30);
  const days = [7, 30, 90].includes(daysRaw) ? daysRaw : 30;

  const result = await safeDbQuery(() => getFinanceSummary(days));
  const s = result.data;

  const cards = s
    ? [
        {
          label: "Inventory cost",
          value: formatInr(s.inventoryCostCents),
          hint: "On-hand × cost (live)",
          href: "/products",
        },
        {
          label: "Inventory retail",
          value: formatInr(s.inventoryRetailCents),
          hint: "On-hand × retail (live)",
          href: "/products",
        },
        {
          label: "Open AR",
          value: formatInr(s.openArCents),
          hint: "Issued unpaid balances",
          href: "/invoices/ar",
        },
        {
          label: "Revenue (issued)",
          value: formatInr(s.revenueIssuedCents),
          hint: `Invoices issued last ${days}d`,
          href: "/invoices",
        },
        {
          label: "Cash collected",
          value: formatInr(s.cashCollectedCents),
          hint: `Payments last ${days}d`,
          href: "/payments",
        },
        {
          label: "COGS (captured)",
          value: formatInr(s.cogsSnapshotCents),
          hint: "Sales × cost captured at fulfillment",
          href: "/stock",
        },
        {
          label: "Legacy COGS estimate",
          value: formatInr(s.cogsLegacyCurrentCents),
          hint: "Pre-snapshot sales × migration-time current cost",
          href: "/stock",
        },
        {
          label: "Gross margin (incl. legacy estimate)",
          value: formatInr(s.grossMarginCents),
          hint: "Revenue − captured COGS − legacy estimate",
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
              className={buttonVariants({
                variant: days === d ? "default" : "outline",
                size: "sm",
              })}
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
            Period: {formatBusinessDate(s.from)} →{" "}
            {formatBusinessDate(s.to)} · Business timezone: {s.timeZone}.
            Captured and legacy cost bases are reported separately.
          </p>
          {s.cogsSnapshotDefectCount > 0 ? (
            <p className="text-sm text-destructive" role="alert">
              Data integrity warning: {s.cogsSnapshotDefectCount} sale{" "}
              {s.cogsSnapshotDefectCount === 1 ? "movement is" : "movements are"}{" "}
              missing a cost snapshot and excluded from COGS.
            </p>
          ) : null}
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
