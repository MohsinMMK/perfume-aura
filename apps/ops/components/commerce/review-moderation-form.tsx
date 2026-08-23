"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import { Field, FieldGroup } from "@perfume-aura/ui/components/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@perfume-aura/ui/components/native-select";
import { moderateCommerceReviewAction } from "@/lib/commerce";

type ReviewStatus = "pending" | "approved" | "rejected";

export function ReviewModerationForm({
  reviewId,
  status,
}: Readonly<{
  reviewId: string;
  status: ReviewStatus;
}>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await moderateCommerceReviewAction(new FormData(event.currentTarget));
      if (!result.ok) setError(result.error);
    } catch {
      setError("Review status could not be updated. Reload and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="expectedStatus" value={status} />
      <FieldGroup className="gap-2">
        <Field orientation="responsive" data-disabled={pending || undefined}>
          <NativeSelect name="status" defaultValue={status} aria-label="Review moderation status" disabled={pending} className="w-full">
            <NativeSelectOption value="pending">Pending</NativeSelectOption>
            <NativeSelectOption value="approved">Approved</NativeSelectOption>
            <NativeSelectOption value="rejected">Rejected</NativeSelectOption>
          </NativeSelect>
          <Button type="submit" size="sm" variant="outline" disabled={pending} focusableWhenDisabled={pending}>{pending ? "Saving…" : "Update"}</Button>
        </Field>
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      </FieldGroup>
    </form>
  );
}
