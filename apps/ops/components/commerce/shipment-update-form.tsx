"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { FormField } from "@/components/form-field";
import { updateShipmentAction } from "@/lib/commerce";

type OrderShipment = {
  courier: string | null;
  id: string;
  shipmentStatus: string | null;
  trackingNumber: string | null;
};

const shipmentStatuses = ["pending", "booked", "shipped", "delivered", "rto", "cancelled"] as const;

export function ShipmentUpdateForm({
  order,
}: Readonly<{
  order: OrderShipment;
}>) {
  const [shipmentPending, setShipmentPending] = useState(false);
  const [shipmentMessage, setShipmentMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<string>(order.shipmentStatus ?? "pending");

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
      <summary className="inline-flex min-h-11 cursor-pointer items-center text-xs font-medium text-primary underline underline-offset-4">
        Update
      </summary>
      <div className="mt-3 grid min-w-[18rem] gap-4 rounded-md border border-border bg-surface p-3">
        <form onSubmit={updateShipment} className="grid gap-3">
          <input type="hidden" name="orderId" value={order.id} />
          <Selector
            id={`status-${order.id}`}
            label="Shipment status"
            htmlName="status"
            value={status}
            onChange={(next) => setStatus(next)}
            options={shipmentStatuses.map((value) => ({ value, label: value }))}
            width="100%"
          />
          <FormField id={`courier-${order.id}`} label="Courier" name="courier" defaultValue={order.courier ?? ""} />
          <FormField id={`tracking-${order.id}`} label="Tracking number" name="trackingNumber" defaultValue={order.trackingNumber ?? ""} />
          <Button
            type="submit"
            size="sm"
            variant="primary"
            label={shipmentPending ? "Saving…" : "Save shipment"}
            isLoading={shipmentPending}
          />
          {shipmentMessage ? (
            <Text as="p" type="supporting" role="status">
              {shipmentMessage}
            </Text>
          ) : null}
        </form>
      </div>
    </details>
  );
}
