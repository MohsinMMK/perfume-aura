"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack } from "@astryxdesign/core/HStack";
import {
  Layout,
  LayoutContent,
  LayoutFooter,
} from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { FormField } from "@/components/form-field";
import { createSeriesAction, updateSeriesAction, type SeriesRow } from "@/lib/production";

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Adds a series, or edits one when `series` is given. */
export function SeriesDialog({ series }: { series?: SeriesRow }) {
  const router = useRouter();
  const showToast = useToast();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [status, setStatus] = useState<"active" | "archived">(series?.status ?? "active");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    const fields = {
      name: String(form.get("name") ?? "").trim(),
      oilConcentrationPercent: Number(form.get("oilConcentrationPercent") ?? 0),
      oilReorderLevelMl: Number(form.get("oilReorderLevelMl") ?? 0),
    };
    let result: { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
    try {
      result = series
        ? await updateSeriesAction({ ...fields, seriesId: series.id, status })
        : await createSeriesAction({ ...fields, slug: slug.trim() });
    } catch {
      setError("The series could not be saved");
      setPending(false);
      return;
    }
    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      setPending(false);
      return;
    }
    showToast({ body: series ? "Series updated" : "Series added" });
    setOpen(false);
    setPending(false);
    router.refresh();
  }

  function onOpenChange(nextOpen: boolean) {
    if (pending) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      setError(null);
      setFieldErrors({});
    }
  }

  const fieldError = (name: string) => fieldErrors[name]?.[0];

  return (
    <>
      <Button
        type="button"
        label={series ? "Edit" : "Add series"}
        variant={series ? "secondary" : "primary"}
        size={series ? "sm" : undefined}
        aria-label={series ? `Edit ${series.name}` : undefined}
        onClick={() => setOpen(true)}
      />
      <Dialog
        isOpen={open}
        onOpenChange={onOpenChange}
        purpose="form"
        width={520}
        maxHeight="calc(100dvh - 2rem)"
      >
        <Layout
          header={
            <DialogHeader
              title={series ? `Edit ${series.name}` : "Add series"}
              subtitle="Every perfume in a series uses the same share of oil; the rest is the base mixture."
              onOpenChange={onOpenChange}
            />
          }
          content={
            <LayoutContent isScrollable>
              <form id={formId} onSubmit={onSubmit}>
                <VStack gap={4}>
                  <FormField
                    label="Name"
                    name="name"
                    id={`${formId}-name`}
                    required
                    placeholder="Signature"
                    defaultValue={series?.name ?? ""}
                    error={fieldError("name")}
                    onChange={
                      series
                        ? undefined
                        : (value) => {
                            if (!slugEdited) setSlug(slugFromName(value));
                          }
                    }
                  />
                  {series ? null : (
                    <FormField
                      label="Slug"
                      name="slug"
                      id={`${formId}-slug`}
                      required
                      placeholder="signature"
                      hint="Lowercase letters, numbers and dashes. It cannot change later."
                      value={slug}
                      onChange={(value) => {
                        setSlugEdited(true);
                        setSlug(value);
                      }}
                      error={fieldError("slug")}
                    />
                  )}
                  <FormField
                    label="Oil share (%)"
                    name="oilConcentrationPercent"
                    id={`${formId}-oilConcentrationPercent`}
                    type="number"
                    min={1}
                    step={1}
                    required
                    hint="A 100 ml bottle at 30% uses 30 ml oil and 70 ml base."
                    defaultValue={series?.oilConcentrationPercent ?? 50}
                    error={fieldError("oilConcentrationPercent")}
                  />
                  <FormField
                    label="Oil reorder level (ml)"
                    name="oilReorderLevelMl"
                    id={`${formId}-oilReorderLevelMl`}
                    type="number"
                    min={0}
                    step={1}
                    required
                    hint="A perfume in this series shows as low once its unreserved oil falls to this level."
                    defaultValue={series?.oilReorderLevelMl ?? 200}
                    error={fieldError("oilReorderLevelMl")}
                  />
                  {series ? (
                    <Selector
                      label="Status"
                      width="100%"
                      value={status}
                      onChange={(value) =>
                        setStatus(value === "archived" ? "archived" : "active")
                      }
                      options={[
                        { value: "active", label: "Active" },
                        { value: "archived", label: "Archived" },
                      ]}
                      controlClassName="min-h-11"
                    />
                  ) : null}
                  {error ? <Banner status="error" title={error} /> : null}
                </VStack>
              </form>
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack justify="end" gap={2} wrap="wrap">
                <Button
                  type="button"
                  label="Cancel"
                  variant="secondary"
                  onClick={() => onOpenChange(false)}
                />
                <Button
                  type="submit"
                  form={formId}
                  label={series ? "Save changes" : "Add series"}
                  variant="primary"
                  isLoading={pending}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
    </>
  );
}
