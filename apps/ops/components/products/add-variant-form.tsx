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
import { FieldError, FieldGroup } from "@perfume-aura/ui/components/field";
import { Spinner } from "@perfume-aura/ui/components/spinner";
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
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Add variant
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add variant</CardTitle>
        <CardDescription>
          Another size/SKU for this product. Prices in rupees.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent>
          <FieldGroup className="gap-4 sm:grid sm:grid-cols-2 sm:gap-4">
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
              label="Cost (Rs)"
              name="cost"
              type="number"
              required
              min={0}
              step="0.01"
              error={fe("cost")}
            />
            <FormField
              label="Retail (Rs)"
              name="retail"
              type="number"
              required
              min={0}
              step="0.01"
              error={fe("retail")}
            />
            {error ? (
              <FieldError className="sm:col-span-2">{error}</FieldError>
            ) : null}
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Saving…" : "Save variant"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
