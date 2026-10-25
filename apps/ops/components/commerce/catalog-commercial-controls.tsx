"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { HStack } from "@astryxdesign/core/HStack";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { FormField } from "@/components/form-field";
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
  return <form onSubmit={onSubmit} className="rounded-md border border-border p-4">
    <VStack gap={3}>
      {children}
      {error ? <Banner status="error" title={error} role="alert" /> : null}
      {message ? <Banner status="success" title={message} role="status" /> : null}
      <HStack justify="end">
        <Button type="submit" size="sm" variant="secondary" label={pending ? "Saving…" : "Save audited record"} isLoading={pending} />
      </HStack>
    </VStack>
  </form>;
}

/** Controlled Astryx checkbox that still posts "on" under `name`, like the native one it replaces. */
function ApprovalCheckbox({ name, label, defaultChecked }: Readonly<{ name: string; label: string; defaultChecked: boolean }>) {
  const [checked, setChecked] = useState(defaultChecked);
  return <div className="flex min-h-11 items-center"><CheckboxInput label={label} htmlName={name} value={checked} onChange={(next) => setChecked(next)} /></div>;
}

function ActiveSwitch({ name, label, defaultChecked }: Readonly<{ name: string; label: string; defaultChecked: boolean }>) {
  const [checked, setChecked] = useState(defaultChecked);
  return <div className="flex min-h-11 items-center"><Switch label={label} htmlName={name} value={checked} onChange={(next) => setChecked(next)} /></div>;
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
    <Text as="p" weight="medium">{value.sizeMl} ml · {value.sku}</Text>
    <div className="grid gap-3 sm:grid-cols-2">
      <FormField id={`amount-${value.variantId}`} label="GST-inclusive retail price (INR)" name="amount" type="number" min="0.01" step="0.01" required defaultValue={value.amountMinor == null ? "" : value.amountMinor / 100} />
      <FormField id={`price-ref-${value.variantId}`} label="CA/owner price approval reference" name="approvalReference" defaultValue={value.approvalReference ?? ""} />
    </div>
    <HStack gap={5} wrap="wrap">
      <ApprovalCheckbox name="approved" label="Approved" defaultChecked={Boolean(value.approvedAt)} />
      <ActiveSwitch name="active" label="Active for sale" defaultChecked={value.active} />
    </HStack>
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
    <VStack gap={0.5}>
      <Text as="p" weight="medium">{value.kind} · {value.dimensions}</Text>
      <Text as="p" type="supporting" wordBreak="break-all">{value.storageKey}</Text>
    </VStack>
    <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
      <FormField id={`alt-${value.mediaId}`} label="Accessible alt text" name="altText" required defaultValue={value.altText} />
      <FormField id={`position-${value.mediaId}`} label="Position" name="position" type="number" min={0} step={1} required defaultValue={value.position} />
    </div>
    <FormField id={`media-ref-${value.mediaId}`} label="Media approval reference" name="approvalReference" defaultValue={value.approvalReference ?? ""} />
    <ApprovalCheckbox name="approved" label="Asset and metadata approved" defaultChecked={Boolean(value.approvedAt)} />
  </AuditedControlForm>;
}
