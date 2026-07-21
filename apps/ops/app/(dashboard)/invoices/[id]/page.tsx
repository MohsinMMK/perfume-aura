import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { getInvoice } from "@/lib/invoices";
import { listActiveVariantsForSelect } from "@/lib/products";
import { safeDbQuery } from "@/lib/db-safe";
import { formatPkr, formatQty } from "@/lib/money";
import { AddInvoiceLineForm } from "@/components/invoices/add-line-form";
import {
  InvoiceStatusActions,
  RemoveLineButton,
} from "@/components/invoices/invoice-actions";
import { DbUnavailableState } from "@/components/db-empty-state";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invResult, variantsResult] = await Promise.all([
    safeDbQuery(() => getInvoice(id)),
    safeDbQuery(() => listActiveVariantsForSelect()),
  ]);

  if (invResult.error) {
    return <DbUnavailableState message={invResult.error} />;
  }
  if (!invResult.data) notFound();

  const inv = invResult.data;
  const variants = (variantsResult.data ?? []).map((v) => ({
    id: v.id,
    label: v.label,
    retailRupees: v.retailCents / 100,
  }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/invoices"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Invoices
          </Link>
          <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight">
            {inv.number ?? "Draft invoice"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {inv.customerName}
            {inv.customerPhone ? ` · ${inv.customerPhone}` : ""}
          </p>
          <div className="mt-2">
            <Badge>{inv.status}</Badge>
          </div>
        </div>
        <InvoiceStatusActions invoiceId={inv.id} status={inv.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Subtotal
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl tabular-nums">
            {formatPkr(inv.subtotalCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl tabular-nums">
            {formatPkr(inv.totalCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl tabular-nums">
            {formatPkr(inv.balanceCents)}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit</TableHead>
                <TableHead className="text-right">Line</TableHead>
                <TableHead className="text-right">Fulfilled</TableHead>
                {inv.status === "draft" ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {inv.lines.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={inv.status === "draft" ? 6 : 5}
                    className="text-center text-muted-foreground"
                  >
                    No lines yet.
                  </TableCell>
                </TableRow>
              ) : (
                inv.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.description}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQty(line.quantity)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPkr(line.unitPriceCents)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPkr(line.lineTotalCents)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQty(line.quantityFulfilled)}
                      {line.variantId ? "" : " · no SKU"}
                    </TableCell>
                    {inv.status === "draft" ? (
                      <TableCell className="text-right">
                        <RemoveLineButton
                          invoiceId={inv.id}
                          lineId={line.id}
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {inv.status === "draft" ? (
        <AddInvoiceLineForm invoiceId={inv.id} variants={variants} />
      ) : null}

      {inv.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">
            {inv.notes}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
