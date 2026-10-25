"use client";

import { useState, type FormEvent } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Selector } from "@astryxdesign/core/Selector";
import { VStack } from "@astryxdesign/core/VStack";
import { TextAreaField } from "@/components/form-field";
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
  const [nextStatus, setNextStatus] = useState<string>(status);

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
      <VStack gap={3}>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <Selector
            label="Return status"
            isLabelHidden
            htmlName="status"
            value={nextStatus}
            onChange={(next) => setNextStatus(next)}
            options={returnStatusTransitions[status].map((value) => ({
              value,
              label: `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`,
            }))}
            width="100%"
          />
          <Button type="submit" size="sm" variant="secondary" label={pending ? "Saving…" : "Update"} isLoading={pending} />
        </div>
        <TextAreaField
          id={`return-resolution-${returnId}`}
          label="Resolution notes"
          name="resolutionNotes"
          placeholder="Required when rejecting or cancelling"
          rows={3}
        />
        {error ? <Banner status="error" title={error} role="alert" /> : null}
      </VStack>
    </form>
  );
}
