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
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@perfume-aura/ui/components/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@perfume-aura/ui/components/native-select";
import { Spinner } from "@perfume-aura/ui/components/spinner";
import { addInvoiceLineAction } from "@/lib/invoices";
import { FormField } from "@/components/form-field";
import { toast } from "@perfume-aura/ui/components/sonner";

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    const variantId = String(fd.get("variantId") ?? "");
    let result: Awaited<ReturnType<typeof addInvoiceLineAction>>;
    try {
      result = await addInvoiceLineAction({
        invoiceId,
        variantId: variantId || undefined,
        description: String(fd.get("description") ?? "").trim(),
        quantity: Number(fd.get("quantity")),
        unitPrice: Number(fd.get("unitPrice")),
      });
    } catch {
      const message = "The invoice line could not be added";
      setError(message);
      toast.error(message);
      setPending(false);
      return;
    }
    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      toast.error(result.error);
      setPending(false);
      return;
    }
    (e.target as HTMLFormElement).reset();
    toast.success("Invoice line added");
    setPending(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add line</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup className="gap-3">
          <Field data-invalid={Boolean(fieldErrors.variantId?.[0])}>
            <FieldLabel htmlFor="variantId">SKU (optional)</FieldLabel>
            <NativeSelect
              id="variantId"
              name="variantId"
              className="w-full"
              defaultValue=""
              aria-invalid={Boolean(fieldErrors.variantId?.[0])}
            >
              <NativeSelectOption value="">Free text / no SKU</NativeSelectOption>
              {variants.map((v) => (
                <NativeSelectOption key={v.id} value={v.id}>
                  {v.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError>{fieldErrors.variantId?.[0]}</FieldError>
          </Field>
          <FormField
            label="Description"
            name="description"
            placeholder="Auto-filled from SKU if empty"
            error={fieldErrors.description?.[0]}
          />
          <FieldGroup className="grid gap-3 sm:grid-cols-2">
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
          </FieldGroup>
          {error ? <FieldError>{error}</FieldError> : null}
          <Button
            type="submit"
            disabled={pending}
            focusableWhenDisabled={pending}
            className="w-fit"
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Add line
          </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
