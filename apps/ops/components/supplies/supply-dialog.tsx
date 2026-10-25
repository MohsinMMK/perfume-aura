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
import { createSupplyAction, updateSupplyAction, type SupplyKind, type SupplyRow } from "@/lib/production";
import { supplyKindLabel, supplyUnit } from "@/components/supplies/supply-options";

/** Adds a supply, or edits one when `supply` is given. */
export function SupplyDialog({ supply }: { supply?: SupplyRow }) {
  const router = useRouter();
  const showToast = useToast();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [kind, setKind] = useState<SupplyKind>(supply?.kind ?? "bottle");
  const [status, setStatus] = useState<"active" | "archived">(supply?.status ?? "active");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    const sizeText = String(form.get("sizeMl") ?? "").trim();
    const fields = {
      name: String(form.get("name") ?? "").trim(),
      sizeMl: kind === "base" || sizeText === "" ? undefined : Number(sizeText),
      reorderLevel: Number(form.get("reorderLevel") ?? 0),
    };
    let result: { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
    try {
      result = supply
        ? await updateSupplyAction({
            ...fields,
            supplyId: supply.id,
            expectedVersion: supply.version,
            status,
          })
        : await createSupplyAction({ ...fields, kind });
    } catch {
      setError("The supply could not be saved");
      setPending(false);
      return;
    }
    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      setPending(false);
      return;
    }
    showToast({ body: supply ? "Supply updated" : "Supply added" });
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
        label={supply ? "Edit" : "Add supply"}
        variant={supply ? "ghost" : "primary"}
        size={supply ? "sm" : undefined}
        aria-label={supply ? `Edit ${supply.name}` : undefined}
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
              title={supply ? `Edit ${supply.name}` : "Add supply"}
              subtitle="Counts change only through receipts, sales and adjustments."
              onOpenChange={onOpenChange}
            />
          }
          content={
            <LayoutContent isScrollable>
              <form id={formId} onSubmit={onSubmit}>
                <VStack gap={4}>
                  {supply ? null : (
                    <Selector
                      label="Type"
                      width="100%"
                      value={kind}
                      onChange={(value) => {
                        if (value === "bottle" || value === "box" || value === "base") {
                          setKind(value);
                        }
                      }}
                      options={(["bottle", "box", "base"] as const).map((value) => ({
                        value,
                        label: supplyKindLabel[value],
                      }))}
                      controlClassName="min-h-11"
                    />
                  )}
                  <FormField
                    label="Name"
                    name="name"
                    id={`${formId}-name`}
                    required
                    placeholder={kind === "base" ? "Base mixture" : "Round glass 50 ml"}
                    defaultValue={supply?.name ?? ""}
                    error={fieldError("name")}
                  />
                  {kind === "base" ? null : (
                    <FormField
                      label="Fits size (ml)"
                      name="sizeMl"
                      id={`${formId}-sizeMl`}
                      type="number"
                      min={1}
                      step={1}
                      required={kind === "bottle"}
                      hint="Series sizes only link packaging made for the same ml."
                      defaultValue={supply?.sizeMl ?? ""}
                      error={fieldError("sizeMl")}
                    />
                  )}
                  <FormField
                    label={`Reorder level (${supplyUnit(kind)})`}
                    name="reorderLevel"
                    id={`${formId}-reorderLevel`}
                    type="number"
                    min={0}
                    step={1}
                    required
                    hint="Alerts show once the count falls to this level."
                    defaultValue={supply?.reorderLevel ?? 0}
                    error={fieldError("reorderLevel")}
                  />
                  {supply ? (
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
                  label={supply ? "Save changes" : "Add supply"}
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
