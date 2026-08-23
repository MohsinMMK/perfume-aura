"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@perfume-aura/ui/components/field";
import { Input } from "@perfume-aura/ui/components/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@perfume-aura/ui/components/native-select";
import { Textarea } from "@perfume-aura/ui/components/textarea";

export function CustomerReviewForm({
  orderItemId,
  productName,
}: Readonly<{
  orderItemId: string;
  productName: string;
}>) {
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
      const response = await fetch("/api/account/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItemId,
          rating: Number(formData.get("rating")),
          title: String(formData.get("title") ?? ""),
          body: String(formData.get("body") ?? ""),
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Your review could not be submitted.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Your review could not be submitted. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return <p className="mt-3 text-sm" role="status">Thank you. Your review is awaiting moderation.</p>;
  }

  if (!open) {
    return <Button type="button" variant="outline" size="sm" className="mt-3 min-h-11 rounded-none border-black/25 bg-transparent" onClick={() => setOpen(true)}>Review this item</Button>;
  }

  return (
    <form onSubmit={submit} className="mt-4 border border-black/15 p-4">
      <p className="font-semibold">Review {productName}</p>
      <FieldGroup className="mt-4 gap-4">
        <Field data-disabled={pending || undefined}>
          <FieldLabel htmlFor={`review-rating-${orderItemId}`}>Rating</FieldLabel>
          <NativeSelect id={`review-rating-${orderItemId}`} name="rating" defaultValue="5" disabled={pending} className="w-full">
            {[5, 4, 3, 2, 1].map((rating) => <NativeSelectOption key={rating} value={rating}>{rating} out of 5</NativeSelectOption>)}
          </NativeSelect>
        </Field>
        <Field data-disabled={pending || undefined}>
          <FieldLabel htmlFor={`review-title-${orderItemId}`}>Title (optional)</FieldLabel>
          <Input id={`review-title-${orderItemId}`} name="title" maxLength={160} disabled={pending} className="rounded-none border-black/25 bg-transparent" />
        </Field>
        <Field data-disabled={pending || undefined} data-invalid={Boolean(error) || undefined}>
          <FieldLabel htmlFor={`review-body-${orderItemId}`}>Your review</FieldLabel>
          <Textarea id={`review-body-${orderItemId}`} name="body" minLength={10} maxLength={2000} required disabled={pending} aria-invalid={Boolean(error) || undefined} className="min-h-28 rounded-none border-black/25 bg-transparent" />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
      </FieldGroup>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="submit" size="sm" disabled={pending} focusableWhenDisabled={pending}>{pending ? "Submitting…" : "Submit review"}</Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
