"use client";

import { useState, type FormEvent } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Selector } from "@astryxdesign/core/Selector";
import { VStack } from "@astryxdesign/core/VStack";
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
  const [nextStatus, setNextStatus] = useState<string>(status);

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
      <VStack gap={2}>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <Selector
            label="Review moderation status"
            isLabelHidden
            htmlName="status"
            value={nextStatus}
            onChange={(next) => setNextStatus(next)}
            options={[
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]}
            width="100%"
          />
          <Button type="submit" size="sm" variant="secondary" label={pending ? "Saving…" : "Update"} isLoading={pending} />
        </div>
        {error ? <Banner status="error" title={error} role="alert" /> : null}
      </VStack>
    </form>
  );
}
