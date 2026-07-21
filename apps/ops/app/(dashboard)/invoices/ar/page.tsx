import Link from "next/link";
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
import { listInvoices, getOpenArTotalCents } from "@/lib/invoices";
import { safeDbQuery } from "@/lib/db-safe";
import { formatPkr } from "@/lib/money";
import { DbUnavailableState } from "@/components/db-empty-state";

export const dynamic = "force-dynamic";

export default async function ArPage() {
  const [listResult, totalResult] = await Promise.all([
    safeDbQuery(() => listInvoices({ status: "ar" })),
    safeDbQuery(() => getOpenArTotalCents()),
  ]);

  const error = listResult.error ?? totalResult.error;
  const rows = listResult.data ?? [];
  const openAr = totalResult.data ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <Link
          href="/invoices"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Invoices
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight">
          Accounts receivable
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Issued invoices with unpaid balances.
        </p>
      </div>

      {error ? <DbUnavailableState message={error} /> : null}

      <Card>
        <CardHeader>
          <CardDescription>Open AR</CardDescription>
          <CardTitle className="text-2xl tabular-nums">
            {formatPkr(openAr)}
          </CardTitle>
        </CardHeader>
      </Card>

      {rows.length === 0 && !error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No open AR. All issued invoices are paid or none issued yet.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {inv.number ?? inv.id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell>{inv.customerName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {inv.issueDate ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPkr(inv.totalCents)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatPkr(inv.balanceCents)}
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
