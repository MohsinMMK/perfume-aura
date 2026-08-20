"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@perfume-aura/ui/components/native-select";
import { updateInquiryStatusAction } from "@/lib/commerce";

type InquiryStatus = "new" | "in_progress" | "resolved" | "archived";

export function InquiryStatusForm({
  inquiryId,
  status,
  updatedAt,
}: Readonly<{
  inquiryId: string;
  status: InquiryStatus;
  updatedAt: string;
}>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await updateInquiryStatusAction(new FormData(event.currentTarget));
      if (!result.ok) setError(result.error);
    } catch {
      setError("Inquiry status could not be updated. Reload and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
      <input type="hidden" name="inquiryId" value={inquiryId} />
      <input type="hidden" name="expectedUpdatedAt" value={updatedAt} />
      <NativeSelect name="status" defaultValue={status} aria-label="Inquiry status" disabled={pending}>
        {status !== "archived" ? <NativeSelectOption value="new">New</NativeSelectOption> : null}
        {status !== "archived" ? <NativeSelectOption value="in_progress">In progress</NativeSelectOption> : null}
        {status !== "archived" ? <NativeSelectOption value="resolved">Resolved</NativeSelectOption> : null}
        <NativeSelectOption value="archived">Archived</NativeSelectOption>
      </NativeSelect>
      <Button type="submit" size="sm" variant="outline" disabled={pending} focusableWhenDisabled={pending}>
        {pending ? "Saving…" : "Update"}
      </Button>
      {error ? <p className="text-sm text-destructive sm:col-span-2" role="alert">{error}</p> : null}
    </form>
  );
}
