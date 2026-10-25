"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { addInvoiceLineAction } from "@/lib/invoices";
import { FormField } from "@/components/form-field";

export function AddInvoiceLineForm({
  invoiceId,
  variants,
}: {
  invoiceId: string;
  variants: { id: string; label: string; retailRupees: number }[];
}) {
  const router = useRouter();
  const showToast = useToast();
  const [variantId, setVariantId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setFieldErrors({});
    const formElement = e.currentTarget;
    const fd = new FormData(formElement);
    const selectedVariantId = String(fd.get("variantId") ?? "");
    let result: Awaited<ReturnType<typeof addInvoiceLineAction>>;
    try {
      result = await addInvoiceLineAction({
        invoiceId,
        variantId: selectedVariantId || undefined,
        description: String(fd.get("description") ?? "").trim(),
        quantity: Number(fd.get("quantity")),
        unitPrice: Number(fd.get("unitPrice")),
      });
    } catch {
      const message = "The invoice line could not be added";
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
    formElement.reset();
    setVariantId("");
    showToast({ body: "Invoice line added" });
    setPending(false);
    router.refresh();
  }

  const variantError = fieldErrors.variantId?.[0];

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <VStack gap={4}>
          <Heading level={2}>Add line</Heading>
          <Selector
            label="SKU (optional)"
            htmlName="variantId"
            width="100%"
            value={variantId}
            onChange={setVariantId}
            options={[
              { value: "", label: "Free text / no SKU" },
              ...variants.map((v) => ({ value: v.id, label: v.label })),
            ]}
            status={
              variantError ? { type: "error", message: variantError } : undefined
            }
          />
          <FormField
            label="Description"
            name="description"
            placeholder="Auto-filled from SKU if empty"
            error={fieldErrors.description?.[0]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Quantity"
              name="quantity"
              type="number"
              required
              defaultValue="1"
              min={1}
              step={1}
              error={fieldErrors.quantity?.[0]}
            />
            <FormField
              label="Unit price (INR)"
              name="unitPrice"
              type="number"
              step="0.01"
              required
              defaultValue="0"
              placeholder="0 = use retail for SKU"
              min={0}
              error={fieldErrors.unitPrice?.[0]}
            />
          </div>
          {error ? <Banner status="error" title={error} role="alert" /> : null}
          <HStack gap={2}>
            <Button
              type="submit"
              label="Add line"
              variant="primary"
              isLoading={pending}
            />
          </HStack>
        </VStack>
      </form>
    </Card>
  );
}
