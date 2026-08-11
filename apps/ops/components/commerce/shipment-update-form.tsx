"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import { Input } from "@perfume-aura/ui/components/input";
import { Label } from "@perfume-aura/ui/components/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@perfume-aura/ui/components/native-select";
import { reconcileCodAction, updateShipmentAction } from "@/lib/commerce";

type OrderShipment = {
  codCollectedAt: Date | null;
  codReconciledAt: Date | null;
  courier: string | null;
  id: string;
  paymentState: string | null;
  shipmentStatus: string | null;
  trackingNumber: string | null;
};

export function ShipmentUpdateForm({
  canReconcileCod,
  order,
}: Readonly<{
  canReconcileCod: boolean;
  order: OrderShipment;
}>) {
  const [shipmentPending, setShipmentPending] = useState(false);
  const [codPending, setCodPending] = useState(false);
  const [shipmentMessage, setShipmentMessage] = useState<string | null>(null);
  const [codMessage, setCodMessage] = useState<string | null>(null);
  const isCodOrder = order.paymentState?.startsWith("cod") ?? false;

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

  async function reconcileCod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCodPending(true);
    setCodMessage(null);
    try {
      const result = await reconcileCodAction(new FormData(event.currentTarget));
      setCodMessage(
        result.ok
          ? "COD reconciliation saved"
          : Object.values(result.fieldErrors ?? {}).flat()[0] ?? result.error,
      );
    } catch {
      setCodMessage("COD reconciliation failed");
    } finally {
      setCodPending(false);
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

        {canReconcileCod && isCodOrder ? (
          <form
            onSubmit={reconcileCod}
            className="grid gap-3 border-t border-border pt-4"
          >
            <input type="hidden" name="orderId" value={order.id} />
            <p className="text-xs font-medium">Owner-only COD reconciliation</p>
            <label className="flex min-h-11 items-center gap-2 text-xs">
              <input
                type="checkbox"
                name="codCollected"
                defaultChecked={Boolean(order.codCollectedAt)}
              />
              COD collected
            </label>
            <label className="flex min-h-11 items-center gap-2 text-xs">
              <input
                type="checkbox"
                name="codReconciled"
                defaultChecked={Boolean(order.codReconciledAt)}
              />
              COD reconciled
            </label>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={codPending}
              focusableWhenDisabled={codPending}
            >
              {codPending ? "Reconciling…" : "Save COD reconciliation"}
            </Button>
            {codMessage ? (
              <p role="status" className="text-xs">
                {codMessage}
              </p>
            ) : null}
          </form>
        ) : null}
      </div>
    </details>
  );
}
