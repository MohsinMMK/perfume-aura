"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { createProductAction } from "@/lib/products";
import { FormField, TextAreaField } from "@/components/form-field";

export function CreateProductForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    const fd = new FormData(e.currentTarget);
    const num = (key: string) => {
      const v = fd.get(key);
      if (v === null || v === "") return undefined;
      return Number(v);
    };

    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      brand: String(fd.get("brand") ?? "").trim(),
      category: String(fd.get("category") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim(),
      withVariant: true,
      sku: String(fd.get("sku") ?? "").trim(),
      barcode: String(fd.get("barcode") ?? "").trim(),
      sizeMl: num("sizeMl"),
      cost: num("cost"),
      retail: num("retail"),
      reorderLevel: num("reorderLevel") ?? 0,
    };

    try {
      const result = await createProductAction(payload);
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

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-2xl">
      <Card>
        <VStack gap={6}>
          <VStack gap={1}>
            <Heading level={2}>New product</Heading>
            <Text as="p" color="secondary">
              Create a catalog product and its first sellable size/SKU. Prices in
              INR rupees (stored as integer paise in legacy `*Cents` columns).
            </Text>
          </VStack>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Name"
              name="name"
              required
              placeholder="e.g. Oud Absolute"
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
              <Heading level={3}>First variant (SKU)</Heading>
            </legend>
            <Text as="p" color="secondary">
              Size, cost, and retail. You can add more variants on the product
              page.
            </Text>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="SKU"
                name="sku"
                required
                placeholder="PA-OUD-50"
                error={fe("sku")}
              />
              <FormField
                label="Barcode"
                name="barcode"
                placeholder="Optional"
                error={fe("barcode")}
              />
              <FormField
                label="Size (ml)"
                name="sizeMl"
                type="number"
                required
                min={1}
                step={1}
                placeholder="50"
                error={fe("sizeMl")}
              />
              <FormField
                label="Reorder level"
                name="reorderLevel"
                type="number"
                min={0}
                step={1}
                defaultValue={2}
                hint="Alert when on-hand ≤ this"
                error={fe("reorderLevel")}
              />
              <FormField
                label="Cost (INR)"
                name="cost"
                type="number"
                required
                min={0}
                step="0.01"
                placeholder="2500"
                error={fe("cost")}
              />
              <FormField
                label="Retail (INR)"
                name="retail"
                type="number"
                required
                min={0}
                step="0.01"
                placeholder="4500"
                error={fe("retail")}
              />
            </div>
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
              label={pending ? "Creating…" : "Create product"}
              variant="primary"
              isLoading={pending}
            />
          </HStack>
        </VStack>
      </Card>
    </form>
  );
}
