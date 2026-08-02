"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import { Input } from "@perfume-aura/ui/components/input";
import { Textarea } from "@perfume-aura/ui/components/textarea";

export function GatedInquiryForm({ kind, enabled }: Readonly<{ kind: "contact" | "wholesale"; enabled: boolean }>) {
  const prefix = kind === "contact" ? "contact" : "wholesale";
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled) return;
    setPending(true);
    setMessage(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const response = await fetch("/api/inquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, name: formData.get("name"), email: formData.get("email"), businessName: formData.get("business"), message: formData.get("message"), website: formData.get("website") }) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Inquiry failed");
      form.reset();
      setMessage("Thank you. Your inquiry has been received.");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Inquiry could not be sent.");
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-5 sm:grid-cols-2" aria-describedby={!enabled ? `${prefix}-gate` : undefined}>
      <div className="sr-only" aria-hidden="true"><label htmlFor={`${prefix}-website`}>Website</label><input id={`${prefix}-website`} name="website" tabIndex={-1} autoComplete="off" /></div>
      <div><label htmlFor={`${prefix}-name`} className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]">Name</label><Input id={`${prefix}-name`} name="name" autoComplete="name" className="min-h-14 rounded-[0.55rem] border-[color:rgb(245_228_199_/_30%)] bg-transparent text-[var(--aura-ivory)]" required disabled={!enabled || pending} /></div>
      <div><label htmlFor={`${prefix}-email`} className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]">Email</label><Input id={`${prefix}-email`} name="email" type="email" autoComplete="email" className="min-h-14 rounded-[0.55rem] border-[color:rgb(245_228_199_/_30%)] bg-transparent text-[var(--aura-ivory)]" required disabled={!enabled || pending} /></div>
      {kind === "wholesale" && <div className="sm:col-span-2"><label htmlFor={`${prefix}-business`} className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]">Business name</label><Input id={`${prefix}-business`} name="business" autoComplete="organization" className="min-h-14 rounded-[0.55rem] border-[color:rgb(245_228_199_/_30%)] bg-transparent text-[var(--aura-ivory)]" required disabled={!enabled || pending} /></div>}
      <div className="sm:col-span-2"><label htmlFor={`${prefix}-message`} className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]">{kind === "contact" ? "How can we help?" : "Tell us about your store"}</label><Textarea id={`${prefix}-message`} name="message" rows={6} minLength={10} maxLength={5_000} className="rounded-[0.55rem] border-[color:rgb(245_228_199_/_30%)] bg-transparent text-[var(--aura-ivory)]" required disabled={!enabled || pending} /></div>
      <div className="sm:col-span-2"><Button type="submit" className="min-h-14 w-full rounded-[0.55rem] bg-[var(--aura-ivory)] px-8 font-display text-xl text-[var(--aura-ink)] hover:bg-white" disabled={!enabled || pending}>{pending ? "Sending…" : "Send inquiry"}</Button>{!enabled ? <p id={`${prefix}-gate`} className="mt-3 text-xs leading-5 text-[color:rgb(245_228_199_/_48%)]">The support channel and consent copy require owner approval before this form can accept submissions.</p> : null}{message ? <p className="mt-3 text-sm" role="status">{message}</p> : null}</div>
    </form>
  );
}
