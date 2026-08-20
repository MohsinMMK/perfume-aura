"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
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
      const response = await fetch("/api/inquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, name: formData.get("name"), email: formData.get("email"), businessName: formData.get("business"), message: formData.get("message"), consentAccepted: formData.get("consent") === "on", website: formData.get("website") }) });
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
      <div><label htmlFor={`${prefix}-name`} className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]">Name</label><Input id={`${prefix}-name`} name="name" autoComplete="name" className="min-h-14 rounded-[var(--aura-radius)] border-[color:rgb(245_228_199_/_30%)] bg-transparent text-[var(--aura-ivory)]" required disabled={!enabled || pending} /></div>
      <div><label htmlFor={`${prefix}-email`} className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]">Email</label><Input id={`${prefix}-email`} name="email" type="email" autoComplete="email" className="min-h-14 rounded-[var(--aura-radius)] border-[color:rgb(245_228_199_/_30%)] bg-transparent text-[var(--aura-ivory)]" required disabled={!enabled || pending} /></div>
      {kind === "wholesale" && <div className="sm:col-span-2"><label htmlFor={`${prefix}-business`} className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]">Business name</label><Input id={`${prefix}-business`} name="business" autoComplete="organization" className="min-h-14 rounded-[var(--aura-radius)] border-[color:rgb(245_228_199_/_30%)] bg-transparent text-[var(--aura-ivory)]" required disabled={!enabled || pending} /></div>}
      <div className="sm:col-span-2"><label htmlFor={`${prefix}-message`} className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]">{kind === "contact" ? "How can we help?" : "Tell us about your store"}</label><Textarea id={`${prefix}-message`} name="message" rows={6} minLength={10} maxLength={5_000} className="rounded-[var(--aura-radius)] border-[color:rgb(245_228_199_/_30%)] bg-transparent text-[var(--aura-ivory)]" required disabled={!enabled || pending} /></div>
      <label className="flex min-h-11 items-start gap-3 text-sm leading-6 text-[var(--aura-ivory)] sm:col-span-2">
        <input name="consent" type="checkbox" required disabled={!enabled || pending} className="mt-1 size-4 shrink-0 accent-[var(--aura-ivory)]" />
        <span>I agree that Perfume Aura may use these details to respond to this inquiry. See the <Link href="/privacy" className="underline decoration-dashed underline-offset-4">privacy policy</Link>.</span>
      </label>
      <div className="sm:col-span-2"><Button type="submit" className="aura-cream-action min-h-14 w-full rounded-[var(--aura-radius)] px-8 font-display text-xl transition-colors" disabled={!enabled || pending}>{pending ? "Sending…" : "Send inquiry"}</Button>{!enabled ? <p id={`${prefix}-gate`} className="mt-3 text-xs leading-5 text-[var(--aura-text-muted-on-ink)]">Inquiries are not open yet.</p> : null}{message ? <p className="mt-3 text-sm" role="status">{message}</p> : null}</div>
    </form>
  );
}
