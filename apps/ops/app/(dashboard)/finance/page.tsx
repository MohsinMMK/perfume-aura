import Link from "next/link";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { getFinanceSummary } from "@/lib/finance";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr } from "@/lib/money";
import { DbUnavailableState } from "@/components/db-empty-state";
import { PageHeader } from "@/components/page-header";
import { formatBusinessDate } from "@/lib/business-date";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ days?: string }>;

export default async function FinancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireCapability("finance.view", { redirectToLogin: true });
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
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Finance"
        description="Signals from inventory, invoices, and payments — not a full ledger."
        actions={[7, 30, 90].map((d) => (
          <Button
            key={d}
            label={`${d}d`}
            href={d === 30 ? "/finance" : `/finance?days=${d}`}
            variant={days === d ? "primary" : "secondary"}
            size="sm"
          />
        ))}
      />

      {result.error || !s ? (
        <DbUnavailableState message={result.error ?? "No data"} />
      ) : (
        <>
          <Text as="p" type="supporting">
            Period: {formatBusinessDate(s.from)} →{" "}
            {formatBusinessDate(s.to)} · Business timezone: {s.timeZone}.
            Captured and legacy cost bases are reported separately.
          </Text>
          {s.cogsSnapshotDefectCount > 0 ? (
            <Banner
              status="error"
              role="alert"
              title={`Data integrity warning: ${s.cogsSnapshotDefectCount} sale ${
                s.cogsSnapshotDefectCount === 1 ? "movement is" : "movements are"
              } missing a cost snapshot and excluded from COGS.`}
            />
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className="group rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Card className="h-full transition-colors group-hover:border-border-strong">
                  <VStack gap={3}>
                    <HStack justify="between" align="start" gap={2}>
                      <VStack gap={1}>
                        <Heading level={3} accessibilityLevel={2} color="secondary">
                          {c.label}
                        </Heading>
                        <Text as="p" size="2xl" weight="semibold" hasTabularNumbers>
                          {c.value}
                        </Text>
                      </VStack>
                      <Token size="sm" label="Live" color="green" />
                    </HStack>
                    <Text as="p" type="supporting">{c.hint}</Text>
                  </VStack>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </VStack>
  );
}
