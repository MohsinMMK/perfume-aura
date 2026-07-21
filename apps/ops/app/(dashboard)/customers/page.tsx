import Link from "next/link";
import { Suspense } from "react";
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
import { listCustomers } from "@/lib/customers";
import { safeDbQuery } from "@/lib/db-safe";
import { ProductFilters } from "@/components/products/product-filters";
import { DbUnavailableState } from "@/components/db-empty-state";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; status?: string }>;

function parseStatus(raw: string | undefined): "active" | "archived" | "all" {
  if (raw === "archived" || raw === "all") return raw;
  return "active";
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = parseStatus(sp.status);
  const result = await safeDbQuery(() => listCustomers({ q, status }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Customers
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Contacts for invoices and AR.
          </p>
        </div>
        <Link
          href="/customers/new"
          className={cn(buttonVariants(), "w-full sm:w-auto")}
        >
          New customer
        </Link>
      </div>

      <Suspense fallback={null}>
        <ProductFilters q={q} status={status} />
      </Suspense>

      {result.error || !result.data ? (
        <DbUnavailableState message={result.error ?? "No data"} />
      ) : result.data.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No customers yet.{" "}
            <Link href="/customers/new" className="underline-offset-4 hover:underline">
              Add one
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {c.name}
                      </Link>
                      {c.email ? (
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.phone ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.city ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          c.status === "active" ? "secondary" : "outline"
                        }
                      >
                        {c.status}
                      </Badge>
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
