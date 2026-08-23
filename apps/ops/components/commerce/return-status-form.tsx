"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@perfume-aura/ui/components/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@perfume-aura/ui/components/native-select";
import { Textarea } from "@perfume-aura/ui/components/textarea";
import { updateCommerceReturnStatusAction } from "@/lib/commerce";
import {
  returnStatusTransitions,
  type CommerceReturnStatus,
} from "@/lib/commerce-lifecycle";

export function ReturnStatusForm({
  returnId,
  status,
}: Readonly<{
  returnId: string;
  status: CommerceReturnStatus;
}>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await updateCommerceReturnStatusAction(new FormData(event.currentTarget));
      if (!result.ok) setError(result.error);
    } catch {
      setError("Return status could not be updated. Reload and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <input type="hidden" name="returnId" value={returnId} />
      <input type="hidden" name="expectedStatus" value={status} />
      <FieldGroup className="gap-3">
        <Field orientation="responsive" data-disabled={pending || undefined}>
          <NativeSelect name="status" defaultValue={status} aria-label="Return status" disabled={pending} className="w-full">
            {returnStatusTransitions[status].map((value) => <NativeSelectOption key={value} value={value}>{value[0]?.toUpperCase()}{value.slice(1)}</NativeSelectOption>)}
          </NativeSelect>
          <Button type="submit" size="sm" variant="outline" disabled={pending} focusableWhenDisabled={pending}>{pending ? "Saving…" : "Update"}</Button>
        </Field>
        <Field data-disabled={pending || undefined} data-invalid={Boolean(error) || undefined}>
          <FieldLabel htmlFor={`return-resolution-${returnId}`}>Resolution notes</FieldLabel>
          <Textarea id={`return-resolution-${returnId}`} name="resolutionNotes" maxLength={2000} placeholder="Required when rejecting or cancelling" disabled={pending} aria-invalid={Boolean(error) || undefined} />
        </Field>
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      </FieldGroup>
    </form>
  );
}
