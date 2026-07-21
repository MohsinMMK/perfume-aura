"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@perfume-aura/ui/components/card";
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@perfume-aura/ui/components/field";
import { Separator } from "@perfume-aura/ui/components/separator";
import { Spinner } from "@perfume-aura/ui/components/spinner";
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
        <CardHeader>
          <CardTitle>New product</CardTitle>
          <CardDescription>
            Create a catalog product and its first sellable size/SKU. Prices in
            rupees (stored as cents).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <FieldGroup className="gap-4 sm:grid sm:grid-cols-2 sm:gap-4">
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
          </FieldGroup>

          <Separator />

          <FieldSet>
            <FieldLegend variant="label">First variant (SKU)</FieldLegend>
            <FieldDescription>
              Size, cost, and retail. You can add more variants on the product
              page.
            </FieldDescription>
            <FieldGroup className="mt-4 gap-4 sm:grid sm:grid-cols-2 sm:gap-4">
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
                label="Cost (Rs)"
                name="cost"
                type="number"
                required
                min={0}
                step="0.01"
                placeholder="2500"
                error={fe("cost")}
              />
              <FormField
                label="Retail (Rs)"
                name="retail"
                type="number"
                required
                min={0}
                step="0.01"
                placeholder="4500"
                error={fe("retail")}
              />
            </FieldGroup>
          </FieldSet>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => router.push("/products")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Creating…" : "Create product"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
