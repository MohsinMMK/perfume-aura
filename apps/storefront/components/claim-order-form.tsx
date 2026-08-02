"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@perfume-aura/ui/components/button";
import { Input } from "@perfume-aura/ui/components/input";

export function ClaimOrderForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const orderUrl = String(new FormData(event.currentTarget).get("orderUrl") ?? "").trim();
    const orderToken = orderUrl.split("/").filter(Boolean).at(-1) ?? "";
    try {
      const response = await fetch("/api/account/claim-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderToken }) });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Claim failed");
      setMessage("Order added to your account.");
      router.refresh();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Order could not be claimed.");
    } finally {
      setPending(false);
    }
  }
  return <form onSubmit={onSubmit} className="mt-10 grid max-w-xl gap-3 border-t border-black/20 pt-6"><label htmlFor="claim-order-url" className="text-xs font-semibold uppercase tracking-[0.16em]">Claim a guest order</label><Input id="claim-order-url" name="orderUrl" type="url" placeholder="Paste your private order-status link" required className="min-h-12 rounded-none border-black/25 bg-transparent" /><Button type="submit" className="min-h-12 rounded-none" disabled={pending} focusableWhenDisabled={pending}>{pending ? "Claiming…" : "Claim order"}</Button>{message ? <p className="text-sm" role="status">{message}</p> : null}</form>;
}
