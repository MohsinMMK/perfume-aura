import { Badge } from "@perfume-aura/ui/components/badge";
import { Card, CardContent } from "@perfume-aura/ui/components/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@perfume-aura/ui/components/table";
import { DbUnavailableState } from "@/components/db-empty-state";
import { listCommercePromotions } from "@/lib/commerce";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr } from "@/lib/money";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";
export default async function CommercePromotionsPage() {
  await requireCapability("commerce.promotions.manage", { redirectToLogin: true });
  const result = await safeDbQuery(() => listCommercePromotions());
  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6"><div><h1 className="font-heading text-2xl font-semibold tracking-tight">Promotions & bundles</h1><p className="mt-1 text-sm text-muted-foreground">Server-authoritative discounts in INR; discovery sets remain excluded.</p></div>{result.error || !result.data ? <DbUnavailableState message={result.error ?? "No data returned."} /> : <Card className="overflow-hidden py-0"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Discount</TableHead><TableHead>Window</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{result.data.map((promo) => <TableRow key={promo.id}><TableCell className="font-mono font-medium">{promo.code}</TableCell><TableCell>{promo.discountAmountMinor ? formatInr(promo.discountAmountMinor) : `${(promo.discountPercentBasisPoints ?? 0) / 100}%`}</TableCell><TableCell>{promo.startsAt.toLocaleDateString("en-IN")} – {promo.endsAt.toLocaleDateString("en-IN")}</TableCell><TableCell><Badge variant={promo.active ? "default" : "secondary"}>{promo.active ? "active" : "inactive"}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>}</div>;
}
