"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import { Input } from "@perfume-aura/ui/components/input";
import type { DeliveryProfileInput } from "@/lib/customer-profile";

const fields = [
  ["delivery-name", "Recipient name", "recipientName", "name"],
  ["delivery-phone", "Indian mobile number", "phone", "tel"],
  ["delivery-line-1", "Address line 1", "addressLine1", "address-line1"],
  ["delivery-line-2", "Address line 2 (optional)", "addressLine2", "address-line2"],
  ["delivery-city", "City", "city", "address-level2"],
  ["delivery-state", "State", "state", "address-level1"],
  ["delivery-postal", "PIN code", "postalCode", "postal-code"],
] as const;

export function DeliveryProfileForm({ profile }: Readonly<{ profile: DeliveryProfileInput | null }>) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/account/delivery-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? "Delivery details saved." : (result.error ?? "Delivery details could not be saved."));
    setPending(false);
  }

  async function remove() {
    setPending(true);
    setMessage(null);
    const response = await fetch("/api/account/delivery-profile", { method: "DELETE" });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? "Saved delivery details deleted." : (result.error ?? "Delivery details could not be deleted."));
    setPending(false);
  }

  return <form onSubmit={save} className="mt-8 grid max-w-2xl gap-5 sm:grid-cols-2">
    {fields.map(([id, label, name, autoComplete], index) => <div key={id} className={index === 2 || index === 3 ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]">{label}</label>
      <Input id={id} name={name} autoComplete={autoComplete} defaultValue={profile?.[name] ?? ""} required={name !== "addressLine2"} disabled={pending} className="min-h-12 rounded-none border-black/25 bg-transparent" />
    </div>)}
    <div className="flex flex-wrap gap-3 sm:col-span-2">
      <Button type="submit" disabled={pending} focusableWhenDisabled={pending} className="min-h-12 rounded-none">{pending ? "Saving…" : "Save delivery details"}</Button>
      {profile ? <Button type="button" variant="outline" disabled={pending} focusableWhenDisabled={pending} onClick={remove} className="min-h-12 rounded-none border-black/25 bg-transparent">Delete saved address</Button> : null}
    </div>
    {message ? <p role="status" className="text-sm sm:col-span-2">{message}</p> : null}
  </form>;
}
