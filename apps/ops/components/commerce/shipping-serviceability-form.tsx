"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import { Input } from "@perfume-aura/ui/components/input";
import { Label } from "@perfume-aura/ui/components/label";
import { updateShippingServiceabilityAction } from "@/lib/commerce";

export type ShippingServiceabilityValue = Readonly<{
  active: boolean;
  delhiveryEnabled: boolean;
  deliveryMaxBusinessDays: number;
  deliveryMinBusinessDays: number;
  expectedUpdatedAt: string;
  indiaPostEnabled: boolean;
  postalCode: string;
}>;

export function ShippingServiceabilityForm({ value }: Readonly<{ value: ShippingServiceabilityValue }>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null); setMessage(null);
    try {
      const result = await updateShippingServiceabilityAction(new FormData(event.currentTarget));
      if (!result.ok) { setError(result.error); return; }
      setMessage("PIN-code serviceability saved.");
    } catch { setError("PIN-code serviceability could not be saved. Reload and try again."); }
    finally { setPending(false); }
  }
  return <form onSubmit={onSubmit} className="grid gap-4 rounded-md border p-4 lg:grid-cols-[8rem_repeat(2,minmax(0,1fr))_8rem_8rem_auto] lg:items-end">
    <input type="hidden" name="expectedUpdatedAt" value={value.expectedUpdatedAt} />
    <div className="grid gap-2"><Label htmlFor={`postal-${value.postalCode || "new"}`}>PIN code</Label><Input id={`postal-${value.postalCode || "new"}`} name="postalCode" inputMode="numeric" pattern="[1-9][0-9]{5}" required readOnly={value.expectedUpdatedAt !== "missing"} defaultValue={value.postalCode} /></div>
    <label className="flex min-h-10 items-center gap-2 text-sm"><input name="delhiveryEnabled" type="checkbox" defaultChecked={value.delhiveryEnabled} className="size-4" />Delhivery</label>
    <label className="flex min-h-10 items-center gap-2 text-sm"><input name="indiaPostEnabled" type="checkbox" defaultChecked={value.indiaPostEnabled} className="size-4" />India Post</label>
    <div className="grid gap-2"><Label htmlFor={`min-${value.postalCode || "new"}`}>Min days</Label><Input id={`min-${value.postalCode || "new"}`} name="deliveryMinBusinessDays" type="number" readOnly required value={3} /></div>
    <div className="grid gap-2"><Label htmlFor={`max-${value.postalCode || "new"}`}>Max days</Label><Input id={`max-${value.postalCode || "new"}`} name="deliveryMaxBusinessDays" type="number" readOnly required value={7} /></div>
    <div className="flex gap-3"><label className="flex min-h-10 items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={value.active} className="size-4" />Active</label><Button type="submit" size="sm" variant="outline" disabled={pending} focusableWhenDisabled={pending}>{pending ? "Saving…" : "Save"}</Button></div>
    {error ? <p className="text-sm text-destructive lg:col-span-6" role="alert">{error}</p> : null}{message ? <p className="text-sm text-emerald-700 lg:col-span-6" role="status">{message}</p> : null}
  </form>;
}
