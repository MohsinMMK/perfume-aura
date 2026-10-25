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
import { listCommerceOrders } from "@/lib/commerce";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr } from "@/lib/money";
import { hasOpsCapability } from "@/lib/ops-access";
import { requireCapability } from "@/lib/session";
import { ShipmentUpdateForm } from "@/components/commerce/shipment-update-form";
import { RefundRequestForm } from "@/components/commerce/refund-request-form";

export const dynamic = "force-dynamic";

export default async function CommerceOrdersPage() {
  const session = await requireCapability("commerce.view", {
    redirectToLogin: true,
  });
  const canManagePayments = hasOpsCapability(
    session.user.role,
    "commerce.refunds.manage",
  );
  const result = await safeDbQuery(() => listCommerceOrders());
  return (
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Orders & manual fulfillment"
        description="Prepaid payment status and shipment progress remain separate, auditable states."
      />
      {result.error || !result.data ? <DbUnavailableState message={result.error ?? "No data returned."} /> : (
        <Card padding={0} className="overflow-hidden">
          <Table hasHover>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Order</TableHeaderCell>
                <TableHeaderCell>Customer</TableHeaderCell>
                <TableHeaderCell>Order state</TableHeaderCell>
                {canManagePayments ? <TableHeaderCell>Payment</TableHeaderCell> : null}
                <TableHeaderCell>Shipment</TableHeaderCell>
                {canManagePayments ? <TableHeaderCell className="text-right">Total</TableHeaderCell> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <VStack gap={0.5}>
                      <Text weight="medium">{row.orderNumber}</Text>
                      <Text type="supporting">{row.placedAt.toLocaleString("en-IN")}</Text>
                    </VStack>
                  </TableCell>
                  <TableCell>{row.guestEmail ?? "Account customer"}</TableCell>
                  <TableCell><Token size="sm" label={row.status} color="gray" /></TableCell>
                  {canManagePayments ? (
                    <TableCell>
                      {row.paymentState ?? "—"}
                      {row.paymentState === "paid" || row.paymentState === "partially_refunded" ? <RefundRequestForm orderId={row.id} /> : null}
                    </TableCell>
                  ) : null}
                  <TableCell>
                    {row.shipmentStatus ?? "Not created"}
                    <Text as="p" type="supporting">{[row.courier, row.trackingNumber].filter(Boolean).join(" · ")}</Text>
                    <ShipmentUpdateForm order={row} />
                  </TableCell>
                  {canManagePayments ? <TableCell className="text-right tabular-nums">{row.totalAmountMinor === null ? "—" : formatInr(row.totalAmountMinor)}</TableCell> : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </VStack>
  );
}
