"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@perfume-aura/ui/components/field";
import { Input } from "@perfume-aura/ui/components/input";
import { Textarea } from "@perfume-aura/ui/components/textarea";

export function CustomerReturnForm({ orderNumber }: Readonly<{ orderNumber: string }>) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/account/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber,
          reason: String(formData.get("reason") ?? ""),
          customerNotes: String(formData.get("customerNotes") ?? ""),
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Your return request could not be created.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Your return request could not be created. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return <p className="text-sm" role="status">Return requested. Support will review it before any shipment or refund action.</p>;
  }
  if (!open) {
    return <Button type="button" variant="outline" className="min-h-12 w-full rounded-none border-black/25 bg-transparent" onClick={() => setOpen(true)}>Request a return</Button>;
  }

  return (
    <form onSubmit={submit} className="border border-black/15 p-5">
      <h2 className="font-display text-2xl">Request a return</h2>
      <FieldGroup className="mt-4 gap-4">
        <Field data-disabled={pending || undefined}>
          <FieldLabel htmlFor="return-reason">Reason</FieldLabel>
          <Input id="return-reason" name="reason" minLength={5} maxLength={240} required disabled={pending} className="rounded-none border-black/25 bg-transparent" />
          <FieldDescription>This requests a review for the complete delivered order. It does not promise approval or a refund.</FieldDescription>
        </Field>
        <Field data-disabled={pending || undefined} data-invalid={Boolean(error) || undefined}>
          <FieldLabel htmlFor="return-notes">Details (optional)</FieldLabel>
          <Textarea id="return-notes" name="customerNotes" maxLength={2000} disabled={pending} aria-invalid={Boolean(error) || undefined} className="min-h-24 rounded-none border-black/25 bg-transparent" />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
      </FieldGroup>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="submit" size="sm" disabled={pending} focusableWhenDisabled={pending}>{pending ? "Submitting…" : "Submit request"}</Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
