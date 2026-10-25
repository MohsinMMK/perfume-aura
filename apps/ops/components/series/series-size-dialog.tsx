"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
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
import type { SupplyOption } from "@/components/supplies/supply-options";
import { saveSeriesSizeAction, type SeriesSizeRow } from "@/lib/production";

const NONE = "none";

/** Adds a size to a series, or edits one when `size` is given. */
export function SeriesSizeDialog({
  seriesId,
  seriesName,
  size,
  supplies,
}: {
  seriesId: string;
  seriesName: string;
  size?: SeriesSizeRow;
  supplies: SupplyOption[];
}) {
  const router = useRouter();
  const showToast = useToast();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [sizeMl, setSizeMl] = useState<number>(size?.sizeMl ?? 0);
  const [bottleId, setBottleId] = useState(size?.bottleSupplyId ?? NONE);
  const [boxId, setBoxId] = useState(size?.boxSupplyId ?? NONE);
  const [isActive, setIsActive] = useState(size?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const packagingOptions = (kind: "bottle" | "box") => [
    { value: NONE, label: kind === "bottle" ? "No bottle tracked" : "No box" },
    ...supplies
      .filter((supply) => supply.kind === kind && supply.sizeMl === sizeMl)
      .map((supply) => ({ value: supply.id, label: supply.name })),
  ];
  const bottleOptions = packagingOptions("bottle");
  const boxOptions = packagingOptions("box");
  const bottleValue = bottleOptions.some((option) => option.value === bottleId) ? bottleId : NONE;
  const boxValue = boxOptions.some((option) => option.value === boxId) ? boxId : NONE;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    let result: { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
    try {
      result = await saveSeriesSizeAction({
        seriesId,
        sizeMl,
        defaultRetail: Number(form.get("defaultRetail") ?? 0),
        bottleSupplyId: bottleValue === NONE ? "" : bottleValue,
        boxSupplyId: boxValue === NONE ? "" : boxValue,
        isActive,
      });
    } catch {
      setError("The size could not be saved");
      setPending(false);
      return;
    }
    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      setPending(false);
      return;
    }
    showToast({ body: size ? "Size updated" : "Size added" });
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
        label={size ? "Edit" : "Add size"}
        variant={size ? "ghost" : "secondary"}
        size="sm"
        aria-label={size ? `Edit ${seriesName} ${size.sizeMl} ml` : `Add a size to ${seriesName}`}
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
              title={size ? `${seriesName} · ${size.sizeMl} ml` : `Add a size to ${seriesName}`}
              subtitle="Each bottle sold in this size uses one bottle and, if set, one box."
              onOpenChange={onOpenChange}
            />
          }
          content={
            <LayoutContent isScrollable>
              <form id={formId} onSubmit={onSubmit}>
                <VStack gap={4}>
                  {size ? null : (
                    <FormField
                      label="Size (ml)"
                      name="sizeMl"
                      id={`${formId}-sizeMl`}
                      type="number"
                      min={1}
                      step={1}
                      required
                      placeholder="50"
                      value={sizeMl === 0 ? "" : sizeMl}
                      onChange={(value) => setSizeMl(Number(value) || 0)}
                      error={fieldError("sizeMl")}
                    />
                  )}
                  <FormField
                    label="Default price (₹)"
                    name="defaultRetail"
                    id={`${formId}-defaultRetail`}
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    hint="Prefills the price of new perfumes in this size. Existing prices do not change."
                    defaultValue={size ? size.defaultRetailCents / 100 : ""}
                    error={fieldError("defaultRetail")}
                  />
                  <Selector
                    label="Bottle"
                    width="100%"
                    value={bottleValue}
                    onChange={(value) => setBottleId(String(value))}
                    options={bottleOptions}
                    controlClassName="min-h-11"
                  />
                  <Selector
                    label="Box"
                    width="100%"
                    value={boxValue}
                    onChange={(value) => setBoxId(String(value))}
                    options={boxOptions}
                    controlClassName="min-h-11"
                  />
                  {sizeMl > 0 && bottleOptions.length === 1 ? (
                    <Banner
                      status="info"
                      title={`No active ${sizeMl} ml bottle yet`}
                      description="Add one on the Supplies page so sales can count it."
                    />
                  ) : null}
                  <CheckboxInput
                    label="Sold in this size"
                    description="Unticked sizes are hidden when creating new perfumes."
                    value={isActive}
                    onChange={(checked) => setIsActive(checked)}
                  />
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
                  label={size ? "Save size" : "Add size"}
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
