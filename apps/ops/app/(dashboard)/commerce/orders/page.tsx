import { Badge } from "@perfume-aura/ui/components/badge";
import { Card, CardContent } from "@perfume-aura/ui/components/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@perfume-aura/ui/components/table";
import { DbUnavailableState } from "@/components/db-empty-state";
import { listCommerceOrders } from "@/lib/commerce";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr } from "@/lib/money";
import { requireOwnerSession } from "@/lib/session";
import { ShipmentUpdateForm } from "@/components/commerce/shipment-update-form";

export const dynamic = "force-dynamic";

export default async function CommerceOrdersPage() {
  await requireOwnerSession({ redirectToLogin: true });
  const result = await safeDbQuery(() => listCommerceOrders());
  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6"><div><h1 className="font-heading text-2xl font-semibold tracking-tight">Orders & manual fulfillment</h1><p className="mt-1 text-sm text-muted-foreground">Prepaid and COD states stay distinct through delivery and reconciliation.</p></div>
    {result.error || !result.data ? <DbUnavailableState message={result.error ?? "No data returned."} /> : <Card className="overflow-hidden py-0"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Order state</TableHead><TableHead>Payment</TableHead><TableHead>Shipment</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{result.data.map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.orderNumber}<p className="text-xs font-normal text-muted-foreground">{row.placedAt.toLocaleString("en-IN")}</p></TableCell><TableCell>{row.guestEmail ?? "Account customer"}</TableCell><TableCell><Badge variant="secondary">{row.status}</Badge></TableCell><TableCell>{row.paymentState}</TableCell><TableCell>{row.shipmentStatus ?? "Not created"}<p className="text-xs text-muted-foreground">{[row.courier, row.trackingNumber].filter(Boolean).join(" · ")}</p><ShipmentUpdateForm order={row} /></TableCell><TableCell className="text-right tabular-nums">{formatInr(row.totalAmountMinor)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>}
  </div>;
}
