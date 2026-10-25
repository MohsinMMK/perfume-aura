import { Card } from "@astryxdesign/core/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { DbUnavailableState } from "@/components/db-empty-state";
import { PageHeader } from "@/components/page-header";
import { listCommercePromotions } from "@/lib/commerce";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr } from "@/lib/money";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";
export default async function CommercePromotionsPage() {
  await requireCapability("commerce.promotions.manage", { redirectToLogin: true });
  const result = await safeDbQuery(() => listCommercePromotions());
  return (
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Promotions & bundles"
        description="Server-authoritative discounts in INR; discovery sets remain excluded."
      />
      {result.error || !result.data ? <DbUnavailableState message={result.error ?? "No data returned."} /> : (
        <Card padding={0} className="overflow-hidden">
          <Table hasHover>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Code</TableHeaderCell>
                <TableHeaderCell>Discount</TableHeaderCell>
                <TableHeaderCell>Window</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((promo) => (
                <TableRow key={promo.id}>
                  <TableCell className="font-mono font-medium">{promo.code}</TableCell>
                  <TableCell className="tabular-nums">{promo.discountAmountMinor ? formatInr(promo.discountAmountMinor) : `${(promo.discountPercentBasisPoints ?? 0) / 100}%`}</TableCell>
                  <TableCell>{promo.startsAt.toLocaleDateString("en-IN")} – {promo.endsAt.toLocaleDateString("en-IN")}</TableCell>
                  <TableCell><Token size="sm" label={promo.active ? "active" : "inactive"} color={promo.active ? "green" : "gray"} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </VStack>
  );
}
