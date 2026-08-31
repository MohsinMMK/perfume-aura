import Link from "next/link";
import { Badge } from "@perfume-aura/ui/components/badge";
import { buttonVariants } from "@perfume-aura/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@perfume-aura/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@perfume-aura/ui/components/table";
import { DbUnavailableState } from "@/components/db-empty-state";
import { formatBusinessDate } from "@/lib/business-date";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr, formatQty } from "@/lib/money";
import { getOperationsReport } from "@/lib/reports";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";

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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Management view
          </p>
          <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight">
            Operations report
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Sales, customers, collections, and perfume-oil coverage in one daily control surface.
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((period) => (
            <Link
              key={period}
              href={period === 30 ? "/reports" : `/reports?days=${period}`}
              className={buttonVariants({
                variant: period === days ? "default" : "outline",
                size: "sm",
              })}
            >
              {period}d
            </Link>
          ))}
        </div>
      </div>

      {result.error || !report ? (
        <DbUnavailableState message={result.error ?? "No report data"} />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {formatBusinessDate(report.from)} → {formatBusinessDate(report.to)}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Sales", formatInr(report.salesCents), `${formatQty(report.invoiceCount)} invoices`],
              ["Collected", formatInr(report.collectedCents), "Recorded payments"],
              ["Bottles sold", formatQty(report.bottlesSold), "Fulfilled stock movements"],
              ["Returns received", formatQty(report.bottlesReturned), "Finished bottles restored to stock"],
              ["Oil used", `${formatQty(report.oilUsedMl)} ml`, "50% concentrate consumption"],
              ["New customers", formatQty(report.newCustomers), `Created in ${days} days`],
              ["Collection gap", formatInr(Math.max(0, report.salesCents - report.collectedCents)), "Sales less receipts in period"],
            ].map(([label, value, hint]) => (
              <Card key={label}>
                <CardHeader className="pb-2">
                  <CardDescription>{label}</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="overflow-hidden py-0">
              <CardHeader className="border-b py-4">
                <CardTitle>Top products</CardTitle>
                <CardDescription>
                  Ranked by gross fulfilled bottles; returns are tracked separately above.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {report.topProducts.length === 0 ? (
                      <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No fulfilled bottles in this period.</TableCell></TableRow>
                    ) : report.topProducts.map((product) => (
                      <TableRow key={`${product.productName}-${product.sizeMl}`}>
                        <TableCell>
                          {product.productName}
                          <p className="text-xs text-muted-foreground">{product.sizeMl} ml</p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatQty(product.quantity)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="overflow-hidden py-0">
              <CardHeader className="border-b py-4">
                <CardTitle>Payment mix</CardTitle>
                <CardDescription>Recorded collection by payment method.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Method</TableHead><TableHead className="text-right">Payments</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {report.paymentMethods.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No payments in this period.</TableCell></TableRow>
                    ) : report.paymentMethods.map((payment) => (
                      <TableRow key={payment.method}>
                        <TableCell className="capitalize">{payment.method.replace("_", " ")}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatQty(payment.count)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatInr(payment.amountCents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden py-0">
            <CardHeader className="border-b py-4">
              <CardTitle>Oil coverage</CardTitle>
              <CardDescription>
                Estimated days remaining uses oil available after active storefront
                holds and the selected period’s average consumption; “No usage”
                means there is not enough history to forecast.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Perfume</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Held</TableHead>
                    <TableHead className="text-right">Used</TableHead>
                    <TableHead className="text-right">Coverage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.oilCoverage.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
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
                        <Badge
                          variant={
                            oil.estimatedDaysLeft !== null &&
                            oil.estimatedDaysLeft <= 14
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {oil.estimatedDaysLeft === null
                            ? "No usage"
                            : `${oil.estimatedDaysLeft} ${oil.estimatedDaysLeft === 1 ? "day" : "days"}`}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily controls</CardTitle>
              <CardDescription>Finish these checks before closing the day.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
              {["All local sales invoiced", "Payments match cash / UPI", "Low stock reviewed", "Oil receipts have supplier references"].map((item) => (
                <div key={item} className="rounded-lg border p-3">{item}</div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
