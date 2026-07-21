import Link from "next/link";
import {
  Card,
  CardContent,
} from "@perfume-aura/ui/components/card";
import { Badge } from "@perfume-aura/ui/components/badge";
import { buttonVariants } from "@perfume-aura/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@perfume-aura/ui/components/table";
import { cn } from "@perfume-aura/ui/lib/utils";
import { listInvoices } from "@/lib/invoices";
import { safeDbQuery } from "@/lib/db-safe";
import { formatPkr } from "@/lib/money";
import { DbUnavailableState } from "@/components/db-empty-state";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string }>;

function parseStatus(
  raw: string | undefined,
): "draft" | "issued" | "paid" | "void" | "all" {
  if (
    raw === "draft" ||
    raw === "issued" ||
    raw === "paid" ||
    raw === "void"
  ) {
    return raw;
  }
  return "all";
}

function statusVariant(
  s: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (s) {
    case "issued":
      return "default";
    case "paid":
      return "secondary";
    case "void":
      return "outline";
    default:
      return "outline";
  }
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const result = await safeDbQuery(() => listInvoices({ status }));

  const filters = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "issued", label: "Issued" },
    { key: "paid", label: "Paid" },
    { key: "void", label: "Void" },
  ] as const;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Invoices
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Draft → issue → paid/void. Stock moves only on fulfill.
          </p>
        </div>
        <Link
          href="/invoices/new"
          className={cn(buttonVariants(), "w-full sm:w-auto")}
        >
          New invoice
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/invoices" : `/invoices?status=${f.key}`}
            className={cn(
              buttonVariants({
                variant: status === f.key ? "default" : "outline",
                size: "sm",
              }),
            )}
          >
            {f.label}
          </Link>
        ))}
        <Link
          href="/invoices/ar"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          AR list
        </Link>
      </div>

      {result.error || !result.data ? (
        <DbUnavailableState message={result.error ?? "No data"} />
      ) : result.data.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No invoices.{" "}
            <Link href="/invoices/new" className="underline-offset-4 hover:underline">
              Create a draft
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {inv.number ?? "Draft"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {inv.customerName}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(inv.status)}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPkr(inv.totalCents)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
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
