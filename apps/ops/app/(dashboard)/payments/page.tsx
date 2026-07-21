import Link from "next/link";
import {
  Card,
  CardContent,
} from "@perfume-aura/ui/components/card";
import { Badge } from "@perfume-aura/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@perfume-aura/ui/components/table";
import { listPayments } from "@/lib/payments";
import { safeDbQuery } from "@/lib/db-safe";
import { formatPkr } from "@/lib/money";
import { DbUnavailableState } from "@/components/db-empty-state";

export const dynamic = "force-dynamic";

function methodLabel(m: string) {
  switch (m) {
    case "bank_transfer":
      return "Bank";
    case "card":
      return "Card";
    case "other":
      return "Other";
    default:
      return "Cash";
  }
}

function formatWhen(d: Date) {
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export default async function PaymentsPage() {
  const result = await safeDbQuery(() => listPayments());

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Payments
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manual receipts against invoices. Never changes stock.
        </p>
      </div>

      {result.error || !result.data ? (
        <DbUnavailableState message={result.error ?? "No data"} />
      ) : result.data.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No payments yet. Record one from an issued invoice.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.number ?? p.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/invoices/${p.invoiceId}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {p.invoiceNumber ?? "Invoice"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.customerName ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{methodLabel(p.method)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatWhen(p.paidAt)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPkr(p.amountCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
