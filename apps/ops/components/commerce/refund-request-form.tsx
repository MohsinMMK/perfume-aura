"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import { Input } from "@perfume-aura/ui/components/input";
import { Label } from "@perfume-aura/ui/components/label";
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
  return <details className="mt-2"><summary className="cursor-pointer text-xs font-medium underline underline-offset-4">Refund</summary><form onSubmit={submit} className="mt-3 grid min-w-[18rem] gap-3 rounded-md border bg-background p-3"><input type="hidden" name="orderId" value={orderId} /><div className="grid gap-1"><Label htmlFor={`refund-amount-${orderId}`}>Amount (INR)</Label><Input id={`refund-amount-${orderId}`} name="amount" type="number" min="0.01" step="0.01" required /></div><div className="grid gap-1"><Label htmlFor={`refund-reason-${orderId}`}>Reason</Label><Input id={`refund-reason-${orderId}`} name="reason" minLength={5} maxLength={240} required /></div><Button type="submit" size="sm" disabled={pending} focusableWhenDisabled={pending}>{pending ? "Requesting…" : "Request refund"}</Button>{message ? <p role="status" className="text-xs">{message}</p> : null}</form></details>;
}
