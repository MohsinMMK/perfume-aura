"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import { Input } from "@perfume-aura/ui/components/input";
import { Label } from "@perfume-aura/ui/components/label";
import {
  updateCatalogMediaAction,
  updateCatalogVariantPriceAction,
} from "@/lib/commerce";

type Result = Awaited<ReturnType<typeof updateCatalogVariantPriceAction>>;

function AuditedControlForm({
  action,
  children,
  successMessage,
}: Readonly<{
  action: (formData: FormData) => Promise<Result>;
  children: ReactNode;
  successMessage: string;
}>) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setMessage(null); setError(null);
    try {
      const result = await action(new FormData(event.currentTarget));
      if (!result.ok) {
        const fieldError = result.fieldErrors ? Object.values(result.fieldErrors).flat()[0] : undefined;
        setError(fieldError ?? result.error);
        return;
      }
      setMessage(successMessage);
    } catch {
      setError("The record could not be saved. Reload and try again.");
    } finally {
      setPending(false);
    }
  }
  return <form onSubmit={onSubmit} className="grid gap-3 rounded-md border p-4">
    {children}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}{message ? <p role="status" className="text-sm text-emerald-700">{message}</p> : null}</div>
      <Button type="submit" size="sm" variant="outline" disabled={pending} focusableWhenDisabled={pending}>{pending ? "Saving…" : "Save audited record"}</Button>
    </div>
  </form>;
}

export function CatalogVariantPriceControl({ value }: Readonly<{ value: {
  active: boolean;
  amountMinor: number | null;
  approvalReference: string | null;
  approvedAt: Date | null;
  expectedUpdatedAt: string;
  productId: string;
  sizeMl: number;
  sku: string;
  variantId: string;
} }>) {
  return <AuditedControlForm action={updateCatalogVariantPriceAction} successMessage="Price evidence saved and audited.">
    <input type="hidden" name="productId" value={value.productId} />
    <input type="hidden" name="variantId" value={value.variantId} />
    <input type="hidden" name="expectedUpdatedAt" value={value.expectedUpdatedAt} />
    <p className="font-medium">{value.sizeMl} ml · {value.sku}</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-2"><Label htmlFor={`amount-${value.variantId}`}>GST-inclusive retail price (INR)</Label><Input id={`amount-${value.variantId}`} name="amount" type="number" min="0.01" step="0.01" required defaultValue={value.amountMinor == null ? "" : value.amountMinor / 100} /></div>
      <div className="grid gap-2"><Label htmlFor={`price-ref-${value.variantId}`}>CA/owner price approval reference</Label><Input id={`price-ref-${value.variantId}`} name="approvalReference" defaultValue={value.approvalReference ?? ""} /></div>
    </div>
    <div className="flex flex-wrap gap-5"><label className="flex min-h-11 items-center gap-2 text-sm"><input className="size-4" type="checkbox" name="approved" defaultChecked={Boolean(value.approvedAt)} />Approved</label><label className="flex min-h-11 items-center gap-2 text-sm"><input className="size-4" type="checkbox" name="active" defaultChecked={value.active} />Active for sale</label></div>
  </AuditedControlForm>;
}

export function CatalogMediaControl({ value }: Readonly<{ value: {
  altText: string;
  approvalReference: string | null;
  approvedAt: Date | null;
  dimensions: string;
  expectedUpdatedAt: string;
  kind: string;
  mediaId: string;
  position: number;
  productId: string;
  storageKey: string;
} }>) {
  return <AuditedControlForm action={updateCatalogMediaAction} successMessage="Media metadata and evidence saved and audited.">
    <input type="hidden" name="productId" value={value.productId} />
    <input type="hidden" name="mediaId" value={value.mediaId} />
    <input type="hidden" name="expectedUpdatedAt" value={value.expectedUpdatedAt} />
    <p className="font-medium">{value.kind} · {value.dimensions}</p>
    <p className="break-all text-xs text-muted-foreground">{value.storageKey}</p>
    <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
      <div className="grid gap-2"><Label htmlFor={`alt-${value.mediaId}`}>Accessible alt text</Label><Input id={`alt-${value.mediaId}`} name="altText" required minLength={5} defaultValue={value.altText} /></div>
      <div className="grid gap-2"><Label htmlFor={`position-${value.mediaId}`}>Position</Label><Input id={`position-${value.mediaId}`} name="position" type="number" min={0} required defaultValue={value.position} /></div>
    </div>
    <div className="grid gap-2"><Label htmlFor={`media-ref-${value.mediaId}`}>Media approval reference</Label><Input id={`media-ref-${value.mediaId}`} name="approvalReference" defaultValue={value.approvalReference ?? ""} /></div>
    <label className="flex min-h-11 items-center gap-2 text-sm"><input className="size-4" type="checkbox" name="approved" defaultChecked={Boolean(value.approvedAt)} />Asset and metadata approved</label>
  </AuditedControlForm>;
}
