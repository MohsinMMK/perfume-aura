import type { ReactNode } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { DbUnavailableState } from "@/components/db-empty-state";
import { PageHeader } from "@/components/page-header";
import { formatBusinessDate } from "@/lib/business-date";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr, formatQty } from "@/lib/money";
import { getOperationsReport } from "@/lib/reports";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";

/** A report table inside a card with its own heading strip. */
function TableSection({
  title,
  description,
  children,
}: Readonly<{ title: string; description: ReactNode; children: ReactNode }>) {
  return (
    <Card padding={0} className="overflow-hidden">
      <div className="border-b border-border px-6 py-4">
        <VStack gap={1}>
          <Heading level={2}>{title}</Heading>
          <Text as="p" color="secondary">{description}</Text>
        </VStack>
      </div>
      {children}
    </Card>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requireCapability("finance.view", { redirectToLogin: true });
  const requestedDays = Number((await searchParams).days ?? 30);
  const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
  const result = await safeDbQuery(() => getOperationsReport(days));
  const report = result.data;

  return (
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <VStack gap={1}>
        <Text as="p" type="supporting" weight="medium" className="uppercase tracking-[0.16em]">
          Management view
        </Text>
        <PageHeader
          title="Operations report"
          description="Sales, customers, collections, and perfume-oil coverage in one daily control surface."
          actions={[7, 30, 90].map((period) => (
            <Button
              key={period}
              label={`${period}d`}
              href={period === 30 ? "/reports" : `/reports?days=${period}`}
              variant={period === days ? "primary" : "secondary"}
              size="sm"
            />
          ))}
        />
      </VStack>

      {result.error || !report ? (
        <DbUnavailableState message={result.error ?? "No report data"} />
      ) : (
        <>
          <Text as="p" type="supporting">
            {formatBusinessDate(report.from)} → {formatBusinessDate(report.to)}
          </Text>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Sales", formatInr(report.salesCents), `${formatQty(report.invoiceCount)} invoices`],
              ["Collected", formatInr(report.collectedCents), "Recorded payments"],
              ["Bottles sold", formatQty(report.bottlesSold), "Fulfilled stock movements"],
              ["Returns received", formatQty(report.bottlesReturned), "Finished bottles restored to stock"],
              ["Oil used", `${formatQty(report.oilUsedMl)} ml`, "Oil used by sales, per series share"],
              ["New customers", formatQty(report.newCustomers), `Created in ${days} days`],
              ["Collection gap", formatInr(Math.max(0, report.salesCents - report.collectedCents)), "Sales less receipts in period"],
            ].map(([label, value, hint]) => (
              <Card key={label} className="h-full">
                <VStack gap={2}>
                  <VStack gap={1}>
                    <Heading level={3} accessibilityLevel={2} color="secondary">{label}</Heading>
                    <Text as="p" size="2xl" weight="semibold" hasTabularNumbers>{value}</Text>
                  </VStack>
                  <Text as="p" type="supporting">{hint}</Text>
                </VStack>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <TableSection
              title="Top products"
              description="Ranked by gross fulfilled bottles; returns are tracked separately above."
            >
              <Table hasHover>
                <TableHeader><TableRow><TableHeaderCell>Product</TableHeaderCell><TableHeaderCell className="text-right">Qty</TableHeaderCell></TableRow></TableHeader>
                <TableBody>
                  {report.topProducts.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center text-secondary">No fulfilled bottles in this period.</TableCell></TableRow>
                  ) : report.topProducts.map((product) => (
                    <TableRow key={`${product.productName}-${product.sizeMl}`}>
                      <TableCell>
                        <VStack gap={0.5}>
                          <Text>{product.productName}</Text>
                          <Text type="supporting">{product.sizeMl} ml</Text>
                        </VStack>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatQty(product.quantity)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableSection>

            <TableSection title="Payment mix" description="Recorded collection by payment method.">
              <Table hasHover>
                <TableHeader><TableRow><TableHeaderCell>Method</TableHeaderCell><TableHeaderCell className="text-right">Payments</TableHeaderCell><TableHeaderCell className="text-right">Amount</TableHeaderCell></TableRow></TableHeader>
                <TableBody>
                  {report.paymentMethods.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-secondary">No payments in this period.</TableCell></TableRow>
                  ) : report.paymentMethods.map((payment) => (
                    <TableRow key={payment.method}>
                      <TableCell className="capitalize">{payment.method.replace("_", " ")}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatQty(payment.count)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatInr(payment.amountCents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableSection>
          </div>

          <TableSection
            title="Oil coverage"
            description={
              <>
                Estimated days remaining uses oil available after active storefront
                holds and the selected period’s average consumption; “No usage”
                means there is not enough history to forecast.
              </>
            }
          >
            <Table hasHover>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Perfume</TableHeaderCell>
                  <TableHeaderCell className="text-right">Available</TableHeaderCell>
                  <TableHeaderCell className="text-right">Held</TableHeaderCell>
                  <TableHeaderCell className="text-right">Used</TableHeaderCell>
                  <TableHeaderCell className="text-right">Coverage</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.oilCoverage.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-secondary">
                      No oil receipts or usage yet.
                    </TableCell>
                  </TableRow>
                ) : report.oilCoverage.map((oil) => (
                  <TableRow key={oil.productId}>
                    <TableCell className="font-medium">{oil.productName}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQty(oil.availableMl)} ml
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQty(oil.reservedMl)} ml
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQty(oil.usedMl)} ml
                    </TableCell>
                    <TableCell className="text-right">
                      <Token
                        size="sm"
                        color={
                          oil.estimatedDaysLeft !== null &&
                          oil.estimatedDaysLeft <= 14
                            ? "red"
                            : "gray"
                        }
                        label={
                          oil.estimatedDaysLeft === null
                            ? "No usage"
                            : `${oil.estimatedDaysLeft} ${oil.estimatedDaysLeft === 1 ? "day" : "days"}`
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableSection>

          <Card>
            <VStack gap={4}>
              <VStack gap={1}>
                <Heading level={2}>Daily controls</Heading>
                <Text as="p" color="secondary">Finish these checks before closing the day.</Text>
              </VStack>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {["All local sales invoiced", "Payments match cash / UPI", "Low stock reviewed", "Oil receipts have supplier references"].map((item) => (
                  <div key={item} className="rounded-lg border border-border p-3">
                    <Text as="p">{item}</Text>
                  </div>
                ))}
              </div>
            </VStack>
          </Card>
        </>
      )}
    </VStack>
  );
}
