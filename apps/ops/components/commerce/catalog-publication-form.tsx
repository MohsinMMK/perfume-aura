"use client";

import { useState, type FormEvent } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { FormField, TextAreaField } from "@/components/form-field";
import { updateCatalogPublicationAction } from "@/lib/commerce";

export type CatalogPublicationInitial = Readonly<{
  audience: string;
  baseNotes: readonly string[];
  concentration: string;
  contentApprovalReference: string;
  contentApproved: boolean;
  expectedUpdatedAt: string;
  featuredRank: number | null;
  heartNotes: readonly string[];
  ingredients: string;
  intensity: string;
  legalApprovalReference: string;
  legalApproved: boolean;
  longevityGuidance: string;
  longDescription: string;
  mediaApprovalReference: string;
  mediaApproved: boolean;
  occasion: string;
  productId: string;
  publicName: string;
  publicSlug: string;
  scentFamily: string;
  season: string;
  seoDescription: string;
  seoTitle: string;
  shortDescription: string;
  sillage: string;
  status: "draft" | "blocked" | "approved" | "published" | "withdrawn";
  topNotes: readonly string[];
  usageInstructions: string;
}>;

export function CatalogPublicationForm({ initial }: Readonly<{ initial: CatalogPublicationInitial }>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<string>(initial.status);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await updateCatalogPublicationAction(new FormData(event.currentTarget));
      if (!result.ok) {
        const firstFieldError = result.fieldErrors
          ? Object.values(result.fieldErrors).flat()[0]
          : undefined;
        setError(firstFieldError ?? result.error);
        return;
      }
      setMessage("Catalog review saved and recorded in the operations audit trail.");
    } catch {
      setError("Catalog review could not be saved. Reload and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <input type="hidden" name="productId" value={initial.productId} />
      <input type="hidden" name="expectedUpdatedAt" value={initial.expectedUpdatedAt} />
      <VStack gap={6}>
        <Card>
          <VStack gap={5}>
            <Heading level={2}>Customer-facing identity and copy</Heading>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Public name" name="publicName" defaultValue={initial.publicName} required />
              <FormField label="Public slug" name="publicSlug" defaultValue={initial.publicSlug} required />
              <FormField label="Scent family" name="scentFamily" defaultValue={initial.scentFamily} />
              <FormField label="Audience" name="audience" defaultValue={initial.audience} />
              <FormField label="Season" name="season" defaultValue={initial.season} />
              <FormField label="Concentration" name="concentration" defaultValue={initial.concentration} />
              <FormField label="Intensity" name="intensity" defaultValue={initial.intensity} />
              <FormField label="Sillage" name="sillage" defaultValue={initial.sillage} />
              <FormField label="Top notes (comma separated)" name="topNotes" defaultValue={initial.topNotes.join(", ")} />
              <FormField label="Heart notes (comma separated)" name="heartNotes" defaultValue={initial.heartNotes.join(", ")} />
              <FormField label="Base notes (comma separated)" name="baseNotes" defaultValue={initial.baseNotes.join(", ")} />
              <FormField label="Occasion" name="occasion" defaultValue={initial.occasion} />
              <TextAreaField className="sm:col-span-2" label="Short description" name="shortDescription" defaultValue={initial.shortDescription} required rows={3} />
              <TextAreaField className="sm:col-span-2" label="Long description" name="longDescription" defaultValue={initial.longDescription} required rows={6} />
              <TextAreaField className="sm:col-span-2" label="Longevity guidance" name="longevityGuidance" defaultValue={initial.longevityGuidance} rows={3} />
              <TextAreaField className="sm:col-span-2" label="Ingredients" name="ingredients" defaultValue={initial.ingredients} rows={3} />
              <TextAreaField className="sm:col-span-2" label="Usage instructions" name="usageInstructions" defaultValue={initial.usageInstructions} rows={3} />
              <FormField label="SEO title" name="seoTitle" defaultValue={initial.seoTitle} required hint="Up to 70 characters." />
              <FormField label="SEO description" name="seoDescription" defaultValue={initial.seoDescription} required hint="Up to 170 characters." />
            </div>
          </VStack>
        </Card>

        <Card>
          <VStack gap={5}>
            <Heading level={2}>Evidence and publication state</Heading>
            <div className="grid gap-5 sm:grid-cols-2">
              {([
                ["legalApproved", "Legal approval", "legalApprovalReference", initial.legalApproved, initial.legalApprovalReference],
                ["contentApproved", "Content approval", "contentApprovalReference", initial.contentApproved, initial.contentApprovalReference],
                ["mediaApproved", "Media approval", "mediaApprovalReference", initial.mediaApproved, initial.mediaApprovalReference],
              ] as const).map(([name, label, referenceName, checked, reference]) => (
                <fieldset key={name} className="grid gap-3 rounded-md border border-border p-4 sm:col-span-2 sm:grid-cols-[13rem_1fr] sm:items-center">
                  <ApprovalCheckbox name={name} label={label} defaultChecked={checked} />
                  <FormField label="Evidence reference" name={referenceName} defaultValue={reference} placeholder="Approved document or decision reference" />
                </fieldset>
              ))}
              <Selector
                label="Publication status"
                htmlName="status"
                value={status}
                onChange={(next) => setStatus(next)}
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "blocked", label: "Blocked" },
                  { value: "approved", label: "Approved" },
                  { value: "published", label: "Published" },
                  { value: "withdrawn", label: "Withdrawn" },
                ]}
              />
              <FormField label="Featured rank" name="featuredRank" type="number" min={0} defaultValue={initial.featuredRank ?? ""} />
              <Text as="p" color="secondary" className="sm:col-span-2">Approval and publication fail closed until every active variant has an approved price reference and approved product media exists. Changed customer-facing copy must first be saved as Draft with legal and content approvals cleared.</Text>
              {error ? <div className="sm:col-span-2"><Banner status="error" title={error} role="alert" /></div> : null}
              {message ? <div className="sm:col-span-2"><Banner status="success" title={message} role="status" /></div> : null}
            </div>
            <HStack justify="end" gap={2}>
              <Button type="submit" variant="primary" label={pending ? "Saving…" : "Save catalog review"} isLoading={pending} />
            </HStack>
          </VStack>
        </Card>
      </VStack>
    </form>
  );
}

/** Controlled Astryx checkbox that still posts "on" under `name`, like the native one it replaces. */
function ApprovalCheckbox({ name, label, defaultChecked }: Readonly<{ name: string; label: string; defaultChecked: boolean }>) {
  const [checked, setChecked] = useState(defaultChecked);
  return <div className="flex min-h-11 items-center"><CheckboxInput label={label} htmlName={name} value={checked} onChange={(next) => setChecked(next)} /></div>;
}
