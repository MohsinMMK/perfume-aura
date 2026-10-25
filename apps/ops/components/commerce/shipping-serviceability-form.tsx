"use client";

import { useState, type FormEvent } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { TextInput } from "@astryxdesign/core/TextInput";
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

/** The 3–7 day delivery window is fixed and read-only, so its inputs never change. */
const noop = () => undefined;

export function ShippingServiceabilityForm({ value }: Readonly<{ value: ShippingServiceabilityValue }>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [postalCode, setPostalCode] = useState(value.postalCode);
  const [delhiveryEnabled, setDelhiveryEnabled] = useState(value.delhiveryEnabled);
  const [indiaPostEnabled, setIndiaPostEnabled] = useState(value.indiaPostEnabled);
  const [active, setActive] = useState(value.active);
  const key = value.postalCode || "new";
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null); setMessage(null);
    try {
      const result = await updateShippingServiceabilityAction(new FormData(event.currentTarget));
      if (!result.ok) { setError(result.error); return; }
      setMessage("PIN-code serviceability saved.");
    } catch { setError("PIN-code serviceability could not be saved. Reload and try again."); }
    finally { setPending(false); }
  }
  return <form onSubmit={onSubmit} className="grid gap-4 rounded-md border border-border p-4 lg:grid-cols-[8rem_repeat(2,minmax(0,1fr))_8rem_8rem_auto] lg:items-end">
    <input type="hidden" name="expectedUpdatedAt" value={value.expectedUpdatedAt} />
    <TextInput id={`postal-${key}`} label="PIN code" htmlName="postalCode" value={postalCode} onChange={(next) => setPostalCode(next)} isRequired isReadOnly={value.expectedUpdatedAt !== "missing"} />
    <div className="flex min-h-11 items-center"><CheckboxInput label="Delhivery" htmlName="delhiveryEnabled" value={delhiveryEnabled} onChange={(next) => setDelhiveryEnabled(next)} /></div>
    <div className="flex min-h-11 items-center"><CheckboxInput label="India Post" htmlName="indiaPostEnabled" value={indiaPostEnabled} onChange={(next) => setIndiaPostEnabled(next)} /></div>
    <NumberInput id={`min-${key}`} label="Min days" htmlName="deliveryMinBusinessDays" value={3} onChange={noop} isReadOnly />
    <NumberInput id={`max-${key}`} label="Max days" htmlName="deliveryMaxBusinessDays" value={7} onChange={noop} isReadOnly />
    <div className="flex flex-wrap items-center gap-3"><div className="flex min-h-11 items-center"><CheckboxInput label="Active" htmlName="active" value={active} onChange={(next) => setActive(next)} /></div><Button type="submit" size="sm" variant="secondary" label={pending ? "Saving…" : "Save"} isLoading={pending} /></div>
    {error ? <div className="lg:col-span-6"><Banner status="error" title={error} role="alert" /></div> : null}{message ? <div className="lg:col-span-6"><Banner status="success" title={message} role="status" /></div> : null}
  </form>;
}
