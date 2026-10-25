"use client";

import { useState, type FormEvent } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Selector } from "@astryxdesign/core/Selector";
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
  const [nextStatus, setNextStatus] = useState<string>(status);

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

  const options = [
    ...(status !== "archived"
      ? [
          { value: "new", label: "New" },
          { value: "in_progress", label: "In progress" },
          { value: "resolved", label: "Resolved" },
        ]
      : []),
    { value: "archived", label: "Archived" },
  ];

  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <input type="hidden" name="inquiryId" value={inquiryId} />
      <input type="hidden" name="expectedUpdatedAt" value={updatedAt} />
      <Selector
        label="Inquiry status"
        isLabelHidden
        htmlName="status"
        value={nextStatus}
        onChange={(next) => setNextStatus(next)}
        options={options}
        width="100%"
      />
      <Button type="submit" size="sm" variant="secondary" label={pending ? "Saving…" : "Update"} isLoading={pending} />
      {error ? <div className="sm:col-span-2"><Banner status="error" title={error} role="alert" /></div> : null}
    </form>
  );
}
