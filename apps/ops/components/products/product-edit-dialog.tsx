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
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { FormField, TextAreaField } from "@/components/form-field";
import { updateProductAction } from "@/lib/products";

type Props = {
  product: {
    id: string;
    name: string;
    brand: string | null;
    category: string | null;
    description: string | null;
    updatedAt: string;
  };
};

export function ProductEditDialog({ product }: Props) {
  const router = useRouter();
  const showToast = useToast();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(product.updatedAt);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    let result: Awaited<ReturnType<typeof updateProductAction>>;
    try {
      result = await updateProductAction({
        productId: product.id,
        expectedUpdatedAt,
        name: String(form.get("name") ?? "").trim(),
        brand: String(form.get("brand") ?? "").trim(),
        category: String(form.get("category") ?? "").trim(),
        description: String(form.get("description") ?? "").trim(),
      });
    } catch {
      const message = "The product update could not be completed";
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

    if (result.data?.updatedAt) setExpectedUpdatedAt(result.data.updatedAt);
    showToast({ body: "Product updated" });
    setOpen(false);
    setPending(false);
    router.refresh();
  }

  const fieldError = (name: string) => fieldErrors[name]?.[0];

  function onOpenChange(nextOpen: boolean) {
    if (pending) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      setError(null);
      setFieldErrors({});
    }
  }

  return (
    <>
      <Button
        type="button"
        label="Edit details"
        variant="secondary"
        size="sm"
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
              title="Edit product"
              subtitle="Update catalog details. Lifecycle and inventory are managed separately."
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
                    required
                    defaultValue={product.name}
                    error={fieldError("name")}
                  />
                  <FormField
                    label="Brand"
                    name="brand"
                    defaultValue={product.brand ?? ""}
                    error={fieldError("brand")}
                  />
                  <FormField
                    label="Category"
                    name="category"
                    defaultValue={product.category ?? ""}
                    error={fieldError("category")}
                  />
                  <TextAreaField
                    label="Description"
                    name="description"
                    defaultValue={product.description ?? ""}
                    error={fieldError("description")}
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
                  label={pending ? "Saving…" : "Save changes"}
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
