"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { createVariantAction } from "@/lib/products";
import { FormField } from "@/components/form-field";

type Props = {
  productId: string;
};

export function AddVariantForm({ productId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [open, setOpen] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    const fd = new FormData(e.currentTarget);
    const payload = {
      productId,
      sku: String(fd.get("sku") ?? "").trim(),
      barcode: String(fd.get("barcode") ?? "").trim(),
      sizeMl: Number(fd.get("sizeMl")),
      cost: Number(fd.get("cost")),
      retail: Number(fd.get("retail")),
      reorderLevel: Number(fd.get("reorderLevel") || 0),
    };

    try {
      const result = await createVariantAction(payload);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        setPending(false);
        return;
      }
      (e.target as HTMLFormElement).reset();
      setOpen(false);
      setPending(false);
      router.refresh();
    } catch {
      setError("Failed to add variant");
      setPending(false);
    }
  }

  const fe = (key: string) => fieldErrors[key]?.[0];

  if (!open) {
    return (
      <HStack>
        <Button
          type="button"
          label="Add variant"
          variant="secondary"
          onClick={() => setOpen(true)}
        />
      </HStack>
    );
  }

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <VStack gap={6}>
          <VStack gap={1}>
            <Heading level={2}>Add variant</Heading>
            <Text as="p" color="secondary">
              Another size/SKU for this product. Prices in rupees.
            </Text>
          </VStack>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="SKU"
              name="sku"
              required
              placeholder="PA-OUD-100"
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
              error={fe("sizeMl")}
            />
            <FormField
              label="Reorder level"
              name="reorderLevel"
              type="number"
              min={0}
              step={1}
              defaultValue={2}
              error={fe("reorderLevel")}
            />
            <FormField
              label="Cost (INR)"
              name="cost"
              type="number"
              required
              min={0}
              step="0.01"
              error={fe("cost")}
            />
            <FormField
              label="Retail (INR)"
              name="retail"
              type="number"
              required
              min={0}
              step="0.01"
              error={fe("retail")}
            />
            {error ? (
              <div className="sm:col-span-2">
                <Banner status="error" title={error} />
              </div>
            ) : null}
          </div>
          <HStack justify="end" gap={2} wrap="wrap">
            <Button
              type="button"
              label="Cancel"
              variant="secondary"
              onClick={() => {
                if (pending) return;
                setOpen(false);
                setError(null);
              }}
            />
            <Button
              type="submit"
              label={pending ? "Saving…" : "Save variant"}
              variant="primary"
              isLoading={pending}
            />
          </HStack>
        </VStack>
      </form>
    </Card>
  );
}
