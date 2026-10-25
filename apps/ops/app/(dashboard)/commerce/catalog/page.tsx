import Link from "next/link";
import { Card } from "@astryxdesign/core/Card";
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
import { listCommerceCatalog } from "@/lib/commerce";
import { safeDbQuery } from "@/lib/db-safe";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";

function publicationColor(status: string | null) {
  if (status === "published") return "green" as const;
  if (status === "approved") return "blue" as const;
  if (status === "blocked") return "red" as const;
  if (status === "withdrawn") return "orange" as const;
  return "gray" as const;
}

export default async function CommerceCatalogPage() {
  await requireCapability("catalog.manage-commercials", { redirectToLogin: true });
  const result = await safeDbQuery(() => listCommerceCatalog());
  return (
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Store catalog approval"
        description="Products publish only after every required gate has explicit evidence."
      />
      {result.error || !result.data ? <DbUnavailableState message={result.error ?? "No data returned."} /> : (
        <Card padding={0} className="overflow-hidden">
          <Table hasHover>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Product</TableHeaderCell>
                <TableHeaderCell>Publication</TableHeaderCell>
                <TableHeaderCell>Approvals</TableHeaderCell>
                <TableHeaderCell>Priced variants</TableHeaderCell>
                <TableHeaderCell>Featured</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((row) => {
                const approvalCount = [row.legalApprovedAt, row.contentApprovedAt, row.mediaApprovedAt].filter(Boolean).length;
                const priceReady = row.activeVariantCount > 0 && row.activeVariantCount === row.pricedVariantCount;
                return (
                  <TableRow key={row.productId}>
                    <TableCell>
                      <VStack gap={0.5}>
                        <Link className="font-medium text-primary underline-offset-4 hover:underline" href={`/commerce/catalog/${row.productId}`}>{row.publicName ?? row.internalName}</Link>
                        <Text type="supporting">
                          {row.publicSlug ?? "Public slug missing"} · <Link className="underline-offset-4 hover:underline" href={`/products/${row.productId}`}>internal record</Link>
                        </Text>
                      </VStack>
                    </TableCell>
                    <TableCell><Token size="sm" label={row.status ?? "not started"} color={publicationColor(row.status)} /></TableCell>
                    <TableCell className="tabular-nums">{approvalCount}/3</TableCell>
                    <TableCell><span className={priceReady ? "tabular-nums text-success" : "tabular-nums text-warning"}>{row.pricedVariantCount}/{row.activeVariantCount}</span></TableCell>
                    <TableCell className="tabular-nums">{row.featuredRank ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </VStack>
  );
}
