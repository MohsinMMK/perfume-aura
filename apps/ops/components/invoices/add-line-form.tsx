"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@perfume-aura/ui/components/card";
import {
  NativeSelect,
  NativeSelectOption,
} from "@perfume-aura/ui/components/native-select";
import { Spinner } from "@perfume-aura/ui/components/spinner";
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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const variantId = String(fd.get("variantId") ?? "");
    const result = await addInvoiceLineAction({
      invoiceId,
      variantId: variantId || undefined,
      description: String(fd.get("description") ?? "").trim(),
      quantity: Number(fd.get("quantity")),
      unitPrice: Number(fd.get("unitPrice")),
    });
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    (e.target as HTMLFormElement).reset();
    setPending(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add line</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="variantId">
              SKU (optional)
            </label>
            <NativeSelect
              id="variantId"
              name="variantId"
              className="w-full"
              defaultValue=""
            >
              <NativeSelectOption value="">Free text / no SKU</NativeSelectOption>
              {variants.map((v) => (
                <NativeSelectOption key={v.id} value={v.id}>
                  {v.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <FormField
            label="Description"
            name="description"
            placeholder="Auto-filled from SKU if empty"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Quantity"
              name="quantity"
              type="number"
              required
              defaultValue="1"
            />
            <FormField
              label="Unit price (Rs)"
              name="unitPrice"
              type="number"
              step="0.01"
              required
              defaultValue="0"
              placeholder="0 = use retail for SKU"
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="w-fit">
            {pending ? <Spinner /> : null}
            Add line
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
