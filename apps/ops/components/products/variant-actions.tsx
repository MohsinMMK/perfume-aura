"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack } from "@astryxdesign/core/HStack";
import {
  Layout,
  LayoutContent,
  LayoutFooter,
} from "@astryxdesign/core/Layout";
import { useToast } from "@astryxdesign/core/Toast";
import { FormField } from "@/components/form-field";
import {
  archiveVariantAction,
  reactivateVariantAction,
  updateVariantAction,
  type VariantRow,
} from "@/lib/products";
import { VariantStockDialogs } from "@/components/stock/variant-stock-dialogs";

type Props = {
  productId: string;
  productName: string;
  productStatus: "active" | "archived";
  variant: VariantRow;
};

export function VariantActions({
  productId,
  productName,
  productStatus,
  variant,
}: Props) {
  const router = useRouter();
  const showToast = useToast();
  const formId = useId();
  const [version, setVersion] = useState(variant.version);
  const [editOpen, setEditOpen] = useState(false);
  const [lifecycleOpen, setLifecycleOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Commercial values are deliberately omitted from staff projections. Never
  // render an editable commercial form from an incomplete projection.
  if (variant.costCents === null || variant.retailCents === null) {
    return null;
  }

  const archiving = variant.status === "active";

  async function onEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    let result: Awaited<ReturnType<typeof updateVariantAction>>;
    try {
      result = await updateVariantAction({
        productId,
        variantId: variant.id,
        expectedVersion: version,
        sku: String(form.get("sku") ?? "").trim(),
        barcode: String(form.get("barcode") ?? "").trim(),
        sizeMl: Number(form.get("sizeMl")),
        cost: Number(form.get("cost")),
        retail: Number(form.get("retail")),
        reorderLevel: Number(form.get("reorderLevel")),
      });
    } catch {
      const message = "The variant update could not be completed";
      setError(message);
      showToast({ body: message, type: "error" });
      setPending(false);
      return;
    }

    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      showToast({ body: result.error, type: "error" });
      setPending(false);
      return;
    }

    if (result.data?.version !== undefined) setVersion(result.data.version);
    showToast({ body: "Variant updated" });
    setEditOpen(false);
    setPending(false);
    router.refresh();
  }

  async function changeLifecycle() {
    setPending(true);
    setError(null);
    const action = archiving ? archiveVariantAction : reactivateVariantAction;
    let result: Awaited<ReturnType<typeof action>>;
    try {
      result = await action({
        productId,
        variantId: variant.id,
        expectedVersion: version,
      });
    } catch {
      const message = "The variant action could not be completed";
      setError(message);
      showToast({ body: message, type: "error" });
      setPending(false);
      return;
    }

    if (!result.ok) {
      setError(result.error);
      showToast({ body: result.error, type: "error" });
      setPending(false);
      return;
    }

    if (result.data?.version !== undefined) setVersion(result.data.version);
    showToast({
      body: archiving ? "Variant archived" : "Variant reactivated",
    });
    setLifecycleOpen(false);
    setPending(false);
    router.refresh();
  }

  const fieldError = (name: string) => fieldErrors[name]?.[0];
  const label = `${productName} — ${variant.sku} (${variant.sizeMl} ml)`;


  function onEditOpenChange(nextOpen: boolean) {
    if (pending) return;
    setEditOpen(nextOpen);
    if (!nextOpen) {
      setError(null);
      setFieldErrors({});
    }
  }

  const lifecycleDescription = archiving
    ? `Archive ${variant.sku}? Its stock balance and movement history remain available.`
    : productStatus === "active"
      ? `Make ${variant.sku} available in stock and invoice selectors again?`
      : "Reactivate the product before reactivating this variant.";

  return (
    <HStack gap={2} align="center" wrap="wrap">
      {variant.status === "active" && productStatus === "active" ? (
        <VariantStockDialogs variantId={variant.id} label={label} />
      ) : null}

      <Button
        type="button"
        label="Edit"
        variant="secondary"
        size="sm"
        onClick={() => setEditOpen(true)}
      />
      <Dialog
        isOpen={editOpen}
        onOpenChange={onEditOpenChange}
        purpose="form"
        width={560}
        maxHeight="calc(100dvh - 2rem)"
      >
        <Layout
          header={
            <DialogHeader
              title="Edit variant"
              subtitle={`Update catalog fields for ${variant.sku}. Stock balances are not changed here.`}
              onOpenChange={onEditOpenChange}
            />
          }
          content={
            <LayoutContent isScrollable>
              <form
                id={formId}
                onSubmit={onEdit}
                className="grid gap-4 sm:grid-cols-2"
              >
                <FormField
                  label="SKU"
                  name="sku"
                  id={`${formId}-sku`}
                  required
                  defaultValue={variant.sku}
                  error={fieldError("sku")}
                />
                <FormField
                  label="Barcode"
                  name="barcode"
                  id={`${formId}-barcode`}
                  defaultValue={variant.barcode ?? ""}
                  error={fieldError("barcode")}
                />
                <FormField
                  label="Size (ml)"
                  name="sizeMl"
                  id={`${formId}-sizeMl`}
                  type="number"
                  min={1}
                  step={1}
                  required
                  defaultValue={variant.sizeMl}
                  error={fieldError("sizeMl")}
                />
                <FormField
                  label="Reorder level"
                  name="reorderLevel"
                  id={`${formId}-reorderLevel`}
                  type="number"
                  min={0}
                  step={1}
                  required
                  defaultValue={variant.reorderLevel}
                  error={fieldError("reorderLevel")}
                />
                <FormField
                  label="Cost (INR)"
                  name="cost"
                  id={`${formId}-cost`}
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  defaultValue={variant.costCents / 100}
                  error={fieldError("cost")}
                />
                <FormField
                  label="Retail (INR)"
                  name="retail"
                  id={`${formId}-retail`}
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  defaultValue={variant.retailCents / 100}
                  error={fieldError("retail")}
                />
                {error ? (
                  <div className="sm:col-span-2">
                    <Banner status="error" title={error} />
                  </div>
                ) : null}
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
                  onClick={() => onEditOpenChange(false)}
                />
                <Button
                  type="submit"
                  form={formId}
                  label={pending ? "Saving…" : "Save variant"}
                  variant="primary"
                  isLoading={pending}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>

      <Button
        type="button"
        label={archiving ? "Archive" : "Reactivate"}
        variant={archiving ? "destructive" : "secondary"}
        size="sm"
        isDisabled={!archiving && productStatus !== "active"}
        onClick={() => setLifecycleOpen(true)}
      />
      <AlertDialog
        isOpen={lifecycleOpen}
        onOpenChange={(nextOpen) => {
          if (pending) return;
          setLifecycleOpen(nextOpen);
          if (!nextOpen) setError(null);
        }}
        title={archiving ? "Archive variant?" : "Reactivate variant?"}
        description={
          error ? `${lifecycleDescription} ${error}` : lifecycleDescription
        }
        actionLabel={archiving ? "Archive variant" : "Reactivate variant"}
        actionVariant={archiving ? "destructive" : "primary"}
        isActionLoading={pending}
        onAction={() => {
          if (!archiving && productStatus !== "active") return;
          void changeLifecycle();
        }}
      />
    </HStack>
  );
}
