"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@perfume-aura/ui/components/card";
import { Input } from "@perfume-aura/ui/components/input";
import { Label } from "@perfume-aura/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@perfume-aura/ui/components/native-select";
import { Textarea } from "@perfume-aura/ui/components/textarea";
import { updateCatalogPublicationAction } from "@/lib/commerce";

export type CatalogPublicationInitial = Readonly<{
  baseNotes: readonly string[];
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
  seoDescription: string;
  seoTitle: string;
  shortDescription: string;
  status: "draft" | "blocked" | "approved" | "published" | "withdrawn";
  topNotes: readonly string[];
  usageInstructions: string;
}>;

export function CatalogPublicationForm({ initial }: Readonly<{ initial: CatalogPublicationInitial }>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
    <form onSubmit={onSubmit} className="grid gap-6">
      <input type="hidden" name="productId" value={initial.productId} />
      <input type="hidden" name="expectedUpdatedAt" value={initial.expectedUpdatedAt} />
      <Card>
        <CardHeader><CardTitle>Customer-facing identity and copy</CardTitle></CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field label="Public name" name="publicName" defaultValue={initial.publicName} required />
          <Field label="Public slug" name="publicSlug" defaultValue={initial.publicSlug} required />
          <Field label="Scent family" name="scentFamily" defaultValue={initial.scentFamily} />
          <Field label="Intensity" name="intensity" defaultValue={initial.intensity} />
          <Field label="Top notes (comma separated)" name="topNotes" defaultValue={initial.topNotes.join(", ")} />
          <Field label="Heart notes (comma separated)" name="heartNotes" defaultValue={initial.heartNotes.join(", ")} />
          <Field label="Base notes (comma separated)" name="baseNotes" defaultValue={initial.baseNotes.join(", ")} />
          <Field label="Occasion" name="occasion" defaultValue={initial.occasion} />
          <TextField label="Short description" name="shortDescription" defaultValue={initial.shortDescription} required rows={3} />
          <TextField label="Long description" name="longDescription" defaultValue={initial.longDescription} required rows={6} />
          <TextField label="Longevity guidance" name="longevityGuidance" defaultValue={initial.longevityGuidance} rows={3} />
          <TextField label="Ingredients" name="ingredients" defaultValue={initial.ingredients} rows={3} />
          <TextField label="Usage instructions" name="usageInstructions" defaultValue={initial.usageInstructions} rows={3} />
          <div className="hidden sm:block" />
          <Field label="SEO title" name="seoTitle" defaultValue={initial.seoTitle} required maxLength={70} />
          <Field label="SEO description" name="seoDescription" defaultValue={initial.seoDescription} required maxLength={170} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Evidence and publication state</CardTitle></CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {[
            ["legalApproved", "Legal approval", "legalApprovalReference", initial.legalApproved, initial.legalApprovalReference],
            ["contentApproved", "Content approval", "contentApprovalReference", initial.contentApproved, initial.contentApprovalReference],
            ["mediaApproved", "Media approval", "mediaApprovalReference", initial.mediaApproved, initial.mediaApprovalReference],
          ].map(([name, label, referenceName, checked, reference]) => (
            <fieldset key={String(name)} className="grid gap-3 rounded-md border p-4 sm:col-span-2 sm:grid-cols-[13rem_1fr] sm:items-center">
              <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
                <input type="checkbox" name={String(name)} defaultChecked={Boolean(checked)} className="size-4" />
                {String(label)}
              </label>
              <div className="grid gap-2">
                <Label htmlFor={String(referenceName)}>Evidence reference</Label>
                <Input id={String(referenceName)} name={String(referenceName)} defaultValue={String(reference)} placeholder="Approved document or decision reference" />
              </div>
            </fieldset>
          ))}
          <div className="grid gap-2">
            <Label htmlFor="status">Publication status</Label>
            <NativeSelect id="status" name="status" defaultValue={initial.status}>
              <NativeSelectOption value="draft">Draft</NativeSelectOption>
              <NativeSelectOption value="blocked">Blocked</NativeSelectOption>
              <NativeSelectOption value="approved">Approved</NativeSelectOption>
              <NativeSelectOption value="published">Published</NativeSelectOption>
              <NativeSelectOption value="withdrawn">Withdrawn</NativeSelectOption>
            </NativeSelect>
          </div>
          <Field label="Featured rank" name="featuredRank" type="number" min={0} defaultValue={initial.featuredRank ?? ""} />
          <p className="text-sm text-muted-foreground sm:col-span-2">Approval and publication fail closed until every active variant has an approved price reference and approved product media exists. Changed customer-facing copy must first be saved as Draft with legal and content approvals cleared.</p>
          {error ? <p className="text-sm text-destructive sm:col-span-2" role="alert">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-700 sm:col-span-2" role="status">{message}</p> : null}
        </CardContent>
        <CardFooter className="justify-end"><Button type="submit" disabled={pending} focusableWhenDisabled={pending}>{pending ? "Saving…" : "Save catalog review"}</Button></CardFooter>
      </Card>
    </form>
  );
}

function Field({ label, name, ...props }: Readonly<{ label: string; name: string } & React.ComponentProps<typeof Input>>) {
  return <div className="grid gap-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} {...props} /></div>;
}

function TextField({ label, name, ...props }: Readonly<{ label: string; name: string } & React.ComponentProps<typeof Textarea>>) {
  return <div className="grid gap-2 sm:col-span-2"><Label htmlFor={name}>{label}</Label><Textarea id={name} name={name} {...props} /></div>;
}
