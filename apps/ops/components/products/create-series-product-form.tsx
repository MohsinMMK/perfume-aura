"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { FormField, TextAreaField } from "@/components/form-field";
import { createSeriesProductAction } from "@/lib/production";

export type SeriesForCreate = {
  id: string;
  name: string;
  oilConcentrationPercent: number;
  sizes: { sizeMl: number; defaultRetailCents: number }[];
};

type SizeDraft = {
  isSelected: boolean;
  sku: string;
  retail: string;
  cost: string;
};

function skuSuggestion(name: string, sizeMl: number): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z0-9]/g, "").slice(0, 3))
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 8);
  return `PA-${initials || "NEW"}-${sizeMl}`;
}

function draftsFor(series: SeriesForCreate | undefined): Record<number, SizeDraft> {
  return Object.fromEntries(
    (series?.sizes ?? []).map((size) => [
      size.sizeMl,
      {
        isSelected: true,
        sku: "",
        retail: String(size.defaultRetailCents / 100),
        cost: "0",
      },
    ]),
  );
}

/** Creates a perfume in a series with one variant per chosen series size. */
export function CreateSeriesProductForm({ series }: { series: SeriesForCreate[] }) {
  const router = useRouter();
  const [seriesId, setSeriesId] = useState(series[0]?.id ?? "");
  const [name, setName] = useState("");
  const [drafts, setDrafts] = useState(() => draftsFor(series[0]));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const selectedSeries = series.find((item) => item.id === seriesId);

  function updateDraft(sizeMl: number, patch: Partial<SizeDraft>) {
    setDrafts((current) => {
      const existing = current[sizeMl];
      return existing ? { ...current, [sizeMl]: { ...existing, ...patch } } : current;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSeries) return;
    setPending(true);
    setError(null);
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    const variants = selectedSeries.sizes
      .filter((size) => drafts[size.sizeMl]?.isSelected)
      .map((size) => {
        const draft = drafts[size.sizeMl]!;
        return {
          sizeMl: size.sizeMl,
          sku: draft.sku.trim() || skuSuggestion(name, size.sizeMl),
          retail: Number(draft.retail || 0),
          cost: Number(draft.cost || 0),
        };
      });
    try {
      const result = await createSeriesProductAction({
        name: name.trim(),
        brand: String(form.get("brand") ?? "").trim(),
        category: String(form.get("category") ?? "").trim(),
        description: String(form.get("description") ?? "").trim(),
        seriesId,
        variants,
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        setPending(false);
        return;
      }
      router.push(`/products/${result.data!.productId}`);
      router.refresh();
    } catch {
      setError("Failed to create product");
      setPending(false);
    }
  }

  const fe = (key: string) => fieldErrors[key]?.[0];
  const pct = selectedSeries?.oilConcentrationPercent ?? 0;

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-3xl">
      <Card>
        <VStack gap={6}>
          <VStack gap={1}>
            <Heading level={2}>New perfume in a series</Heading>
            <Text as="p" color="secondary">
              The series sets the oil share and the bottle and box each size uses.
              Every ticked size becomes a sellable variant. Prices in INR rupees.
            </Text>
          </VStack>

          <Selector
            label="Series"
            width="100%"
            value={seriesId}
            onChange={(value) => {
              const next = series.find((item) => item.id === value);
              setSeriesId(String(value));
              setDrafts(draftsFor(next));
            }}
            options={series.map((item) => ({
              value: item.id,
              label: `${item.name} · ${item.oilConcentrationPercent}% oil`,
            }))}
            controlClassName="min-h-11"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Name"
              name="name"
              required
              placeholder="e.g. Oud Absolute"
              value={name}
              onChange={setName}
              error={fe("name")}
              className="sm:col-span-2"
            />
            <FormField
              label="Brand"
              name="brand"
              placeholder="e.g. Perfume Aura"
              error={fe("brand")}
            />
            <FormField
              label="Category"
              name="category"
              placeholder="e.g. Oriental"
              error={fe("category")}
            />
            <TextAreaField
              label="Description"
              name="description"
              placeholder="Optional notes for internal catalog"
              error={fe("description")}
              className="sm:col-span-2"
            />
          </div>

          <Divider />

          <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
            <legend className="mb-1 p-0">
              <Heading level={3}>Sizes</Heading>
            </legend>
            {!selectedSeries || selectedSeries.sizes.length === 0 ? (
              <Banner
                status="warning"
                title="This series has no sizes yet"
                description="Add its sizes on the Series page first."
              />
            ) : (
              selectedSeries.sizes.map((size) => {
                const draft = drafts[size.sizeMl];
                if (!draft) return null;
                const oilMl = Math.ceil((size.sizeMl * pct) / 100);
                return (
                  <VStack key={size.sizeMl} gap={3}>
                    <CheckboxInput
                      label={`${size.sizeMl} ml`}
                      description={`${oilMl} ml oil and ${size.sizeMl - oilMl} ml base per bottle`}
                      value={draft.isSelected}
                      onChange={(checked) => updateDraft(size.sizeMl, { isSelected: checked })}
                    />
                    {draft.isSelected ? (
                      <div className="grid gap-4 sm:grid-cols-3">
                        <FormField
                          label={`SKU (${size.sizeMl} ml)`}
                          name={`sku-${size.sizeMl}`}
                          placeholder={skuSuggestion(name, size.sizeMl)}
                          hint="Leave blank to use the suggested SKU."
                          value={draft.sku}
                          onChange={(value) => updateDraft(size.sizeMl, { sku: value })}
                        />
                        <FormField
                          label={`Retail (${size.sizeMl} ml, INR)`}
                          name={`retail-${size.sizeMl}`}
                          type="number"
                          required
                          min={0}
                          step="0.01"
                          value={draft.retail}
                          onChange={(value) => updateDraft(size.sizeMl, { retail: value })}
                        />
                        <FormField
                          label={`Cost (${size.sizeMl} ml, INR)`}
                          name={`cost-${size.sizeMl}`}
                          type="number"
                          required
                          min={0}
                          step="0.01"
                          value={draft.cost}
                          onChange={(value) => updateDraft(size.sizeMl, { cost: value })}
                        />
                      </div>
                    ) : null}
                  </VStack>
                );
              })
            )}
            {fe("variants") ? <Banner status="error" title={fe("variants")!} /> : null}
          </fieldset>

          {error ? <Banner status="error" title={error} /> : null}

          <HStack justify="end" gap={2} wrap="wrap">
            <Button
              type="button"
              label="Cancel"
              variant="secondary"
              onClick={() => {
                if (pending) return;
                router.push("/products");
              }}
            />
            <Button
              type="submit"
              label={pending ? "Creating…" : "Create perfume"}
              variant="primary"
              isLoading={pending}
            />
          </HStack>
        </VStack>
      </Card>
    </form>
  );
}
