import { Badge } from "@perfume-aura/ui/components/badge";
import { Card, CardContent } from "@perfume-aura/ui/components/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@perfume-aura/ui/components/table";
import { DbUnavailableState } from "@/components/db-empty-state";
import { listCommerceOrders } from "@/lib/commerce";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr } from "@/lib/money";
import { hasOpsCapability } from "@/lib/ops-access";
import { requireCapability } from "@/lib/session";
import { ShipmentUpdateForm } from "@/components/commerce/shipment-update-form";

export const dynamic = "force-dynamic";

export default async function CommerceOrdersPage() {
  const session = await requireCapability("commerce.view", {
    redirectToLogin: true,
  });
  const canReconcileCod = hasOpsCapability(
    session.user.role,
    "commerce.cod.reconcile",
  );
  const result = await safeDbQuery(() => listCommerceOrders());
  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6"><div><h1 className="font-heading text-2xl font-semibold tracking-tight">Orders & manual fulfillment</h1><p className="mt-1 text-sm text-muted-foreground">Prepaid and COD states stay distinct through delivery and reconciliation.</p></div>
    {result.error || !result.data ? <DbUnavailableState message={result.error ?? "No data returned."} /> : <Card className="overflow-hidden py-0"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Order state</TableHead>{canReconcileCod ? <TableHead>Payment</TableHead> : null}<TableHead>Shipment</TableHead>{canReconcileCod ? <TableHead className="text-right">Total</TableHead> : null}</TableRow></TableHeader><TableBody>{result.data.map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.orderNumber}<p className="text-xs font-normal text-muted-foreground">{row.placedAt.toLocaleString("en-IN")}</p></TableCell><TableCell>{row.guestEmail ?? "Account customer"}</TableCell><TableCell><Badge variant="secondary">{row.status}</Badge></TableCell>{canReconcileCod ? <TableCell>{row.paymentState ?? "—"}</TableCell> : null}<TableCell>{row.shipmentStatus ?? "Not created"}<p className="text-xs text-muted-foreground">{[row.courier, row.trackingNumber].filter(Boolean).join(" · ")}</p><ShipmentUpdateForm canReconcileCod={canReconcileCod} order={row} /></TableCell>{canReconcileCod ? <TableCell className="text-right tabular-nums">{row.totalAmountMinor === null ? "—" : formatInr(row.totalAmountMinor)}</TableCell> : null}</TableRow>)}</TableBody></Table></CardContent></Card>}
  </div>;
}
