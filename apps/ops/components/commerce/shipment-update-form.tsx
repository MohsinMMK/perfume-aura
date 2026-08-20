"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import { Input } from "@perfume-aura/ui/components/input";
import { Label } from "@perfume-aura/ui/components/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@perfume-aura/ui/components/native-select";
import { updateShipmentAction } from "@/lib/commerce";

type OrderShipment = {
  courier: string | null;
  id: string;
  shipmentStatus: string | null;
  trackingNumber: string | null;
};

export function ShipmentUpdateForm({
  order,
}: Readonly<{
  order: OrderShipment;
}>) {
  const [shipmentPending, setShipmentPending] = useState(false);
  const [shipmentMessage, setShipmentMessage] = useState<string | null>(null);

  async function updateShipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShipmentPending(true);
    setShipmentMessage(null);
    try {
      const result = await updateShipmentAction(new FormData(event.currentTarget));
      setShipmentMessage(
        result.ok
          ? "Shipment saved"
          : Object.values(result.fieldErrors ?? {}).flat()[0] ?? result.error,
      );
    } catch {
      setShipmentMessage("Shipment update failed");
    } finally {
      setShipmentPending(false);
    }
  }

  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs font-medium underline underline-offset-4">
        Update
      </summary>
      <div className="mt-3 grid min-w-[18rem] gap-4 rounded-md border bg-background p-3">
        <form onSubmit={updateShipment} className="grid gap-3">
          <input type="hidden" name="orderId" value={order.id} />
          <div className="grid gap-1">
            <Label htmlFor={`status-${order.id}`}>Shipment status</Label>
            <NativeSelect
              id={`status-${order.id}`}
              name="status"
              defaultValue={order.shipmentStatus ?? "pending"}
            >
              {[
                "pending",
                "booked",
                "shipped",
                "delivered",
                "rto",
                "cancelled",
              ].map((status) => (
                <NativeSelectOption key={status} value={status}>
                  {status}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1">
            <Label htmlFor={`courier-${order.id}`}>Courier</Label>
            <Input
              id={`courier-${order.id}`}
              name="courier"
              defaultValue={order.courier ?? ""}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor={`tracking-${order.id}`}>Tracking number</Label>
            <Input
              id={`tracking-${order.id}`}
              name="trackingNumber"
              defaultValue={order.trackingNumber ?? ""}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={shipmentPending}
            focusableWhenDisabled={shipmentPending}
          >
            {shipmentPending ? "Saving…" : "Save shipment"}
          </Button>
          {shipmentMessage ? (
            <p role="status" className="text-xs">
              {shipmentMessage}
            </p>
          ) : null}
        </form>
      </div>
    </details>
  );
}
