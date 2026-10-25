"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { FormField } from "@/components/form-field";
import { requestRefundAction } from "@/lib/commerce";

export function RefundRequestForm({ orderId }: Readonly<{ orderId: string }>) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const result = await requestRefundAction(new FormData(event.currentTarget));
      setMessage(result.ok ? "Refund requested; awaiting Cashfree confirmation." : result.error);
    } catch {
      setMessage("Refund request failed.");
    } finally {
      setPending(false);
    }
  }
  return (
    <details className="mt-2">
      <summary className="inline-flex min-h-11 cursor-pointer items-center text-xs font-medium text-primary underline underline-offset-4">Refund</summary>
      <form onSubmit={submit} className="mt-3 grid min-w-[18rem] gap-3 rounded-md border border-border bg-surface p-3">
        <input type="hidden" name="orderId" value={orderId} />
        <FormField id={`refund-amount-${orderId}`} label="Amount (INR)" name="amount" type="number" min="0.01" step="0.01" required />
        <FormField id={`refund-reason-${orderId}`} label="Reason" name="reason" required hint="5 to 240 characters." />
        <Button type="submit" size="sm" variant="primary" label={pending ? "Requesting…" : "Request refund"} isLoading={pending} />
        {message ? <Text as="p" type="supporting" role="status">{message}</Text> : null}
      </form>
    </details>
  );
}
