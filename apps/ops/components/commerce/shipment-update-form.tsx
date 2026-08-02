"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import { Input } from "@perfume-aura/ui/components/input";
import { Label } from "@perfume-aura/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@perfume-aura/ui/components/native-select";
import { updateShipmentAction } from "@/lib/commerce";

export function ShipmentUpdateForm({ order }: Readonly<{
  order: {
    id: string;
    shipmentStatus: string | null;
    courier: string | null;
    trackingNumber: string | null;
    codCollectedAt: Date | null;
    codReconciledAt: Date | null;
    paymentState: string;
  };
}>) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const result = await updateShipmentAction(new FormData(event.currentTarget));
      setMessage(result.ok ? "Saved" : Object.values(result.fieldErrors ?? {}).flat()[0] ?? result.error);
    } catch {
      setMessage("Shipment update failed");
    } finally {
      setPending(false);
    }
  }
  return <details className="mt-2"><summary className="cursor-pointer text-xs font-medium underline underline-offset-4">Update</summary><form onSubmit={onSubmit} className="mt-3 grid min-w-[18rem] gap-3 rounded-md border bg-background p-3"><input type="hidden" name="orderId" value={order.id} /><div className="grid gap-1"><Label htmlFor={`status-${order.id}`}>Shipment status</Label><NativeSelect id={`status-${order.id}`} name="status" defaultValue={order.shipmentStatus ?? "pending"}>{["pending", "booked", "shipped", "delivered", "rto", "cancelled"].map((status) => <NativeSelectOption key={status} value={status}>{status}</NativeSelectOption>)}</NativeSelect></div><div className="grid gap-1"><Label htmlFor={`courier-${order.id}`}>Courier</Label><Input id={`courier-${order.id}`} name="courier" defaultValue={order.courier ?? ""} /></div><div className="grid gap-1"><Label htmlFor={`tracking-${order.id}`}>Tracking number</Label><Input id={`tracking-${order.id}`} name="trackingNumber" defaultValue={order.trackingNumber ?? ""} /></div>{order.paymentState.startsWith("cod") ? <><label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" name="codCollected" defaultChecked={Boolean(order.codCollectedAt)} />COD collected</label><label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" name="codReconciled" defaultChecked={Boolean(order.codReconciledAt)} />COD reconciled</label></> : null}<Button type="submit" size="sm" disabled={pending} focusableWhenDisabled={pending}>{pending ? "Saving…" : "Save shipment"}</Button>{message ? <p role="status" className="text-xs">{message}</p> : null}</form></details>;
}
