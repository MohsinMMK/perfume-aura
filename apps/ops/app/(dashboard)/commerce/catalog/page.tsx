import Link from "next/link";
import { Badge } from "@perfume-aura/ui/components/badge";
import { Card, CardContent } from "@perfume-aura/ui/components/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@perfume-aura/ui/components/table";
import { DbUnavailableState } from "@/components/db-empty-state";
import { listCommerceCatalog } from "@/lib/commerce";
import { safeDbQuery } from "@/lib/db-safe";
import { requireOwnerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CommerceCatalogPage() {
  await requireOwnerSession({ redirectToLogin: true });
  const result = await safeDbQuery(() => listCommerceCatalog());
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div><h1 className="font-heading text-2xl font-semibold tracking-tight">Store catalog approval</h1><p className="mt-1 text-sm text-muted-foreground">Products publish only after every required gate has explicit evidence.</p></div>
      {result.error || !result.data ? <DbUnavailableState message={result.error ?? "No data returned."} /> : (
        <Card className="overflow-hidden py-0"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Publication</TableHead><TableHead>Approvals</TableHead><TableHead>Priced variants</TableHead><TableHead>Featured</TableHead></TableRow></TableHeader><TableBody>
          {result.data.map((row) => {
            const approvalCount = [row.legalApprovedAt, row.contentApprovedAt, row.mediaApprovedAt].filter(Boolean).length;
            const priceReady = row.activeVariantCount > 0 && row.activeVariantCount === row.pricedVariantCount;
            return <TableRow key={row.productId}><TableCell><Link className="font-medium underline-offset-4 hover:underline" href={`/products/${row.productId}`}>{row.publicName ?? row.internalName}</Link><p className="text-xs text-muted-foreground">{row.publicSlug ?? "Public slug missing"}</p></TableCell><TableCell><Badge variant={row.status === "published" ? "default" : "secondary"}>{row.status ?? "not started"}</Badge></TableCell><TableCell>{approvalCount}/3</TableCell><TableCell><span className={priceReady ? "text-emerald-700" : "text-amber-700"}>{row.pricedVariantCount}/{row.activeVariantCount}</span></TableCell><TableCell>{row.featuredRank ?? "—"}</TableCell></TableRow>;
          })}
        </TableBody></Table></CardContent></Card>
      )}
    </div>
  );
}
