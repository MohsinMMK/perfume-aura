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
import { receiveStockAction } from "@/lib/stock";
import { FormField, TextAreaField } from "@/components/form-field";

export type VariantOption = {
  id: string;
  label: string;
};

type Props = {
  variants: VariantOption[];
  /** Pre-select a variant (e.g. from product detail). */
  defaultVariantId?: string;
  title?: string;
  description?: string;
  compact?: boolean;
};

export function ReceiveStockForm({
  variants,
  defaultVariantId,
  title = "Receive stock",
  description = "Add units to on-hand via the inventory ledger.",
  compact,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    const fd = new FormData(e.currentTarget);
    const payload = {
      variantId: String(fd.get("variantId") ?? ""),
      quantity: Number(fd.get("quantity")),
      note: String(fd.get("note") ?? "").trim(),
    };

    try {
      const result = await receiveStockAction(payload);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        setPending(false);
        return;
      }
      setSuccess(`Received. On hand now: ${result.data?.quantityAfter}`);
      (e.target as HTMLFormElement).reset();
      setPending(false);
      router.refresh();
    } catch {
      setError("Receive failed");
      setPending(false);
    }
  }

  const fe = (key: string) => fieldErrors[key]?.[0];

  if (variants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            No active variants yet. Create a product first.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent>
          <FieldGroup
            className={
              compact
                ? "gap-3"
                : "gap-4 sm:grid sm:grid-cols-2 sm:gap-4"
            }
          >
            <Field
              data-invalid={fe("variantId") ? true : undefined}
              className={compact ? undefined : "sm:col-span-2"}
            >
              <FieldLabel htmlFor="variantId">
                Variant <span className="text-destructive">*</span>
              </FieldLabel>
              <NativeSelect
                id="variantId"
                name="variantId"
                required
                defaultValue={defaultVariantId ?? ""}
                className="w-full"
                aria-invalid={fe("variantId") ? true : undefined}
              >
                <NativeSelectOption value="" disabled>
                  Select SKU…
                </NativeSelectOption>
                {variants.map((v) => (
                  <NativeSelectOption key={v.id} value={v.id}>
                    {v.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {fe("variantId") ? (
                <FieldError>{fe("variantId")}</FieldError>
              ) : null}
            </Field>
            <FormField
              label="Quantity"
              name="quantity"
              type="number"
              required
              min={1}
              step={1}
              placeholder="1"
              error={fe("quantity")}
            />
            <TextAreaField
              label="Note"
              name="note"
              placeholder="Optional — PO ref, supplier…"
              error={fe("note")}
              rows={2}
              className={compact ? undefined : "sm:col-span-2"}
            />
            {error ? (
              <FieldError className="sm:col-span-2">{error}</FieldError>
            ) : null}
            {success ? (
              <p
                className="text-sm text-muted-foreground sm:col-span-2"
                role="status"
              >
                {success}
              </p>
            ) : null}
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Receiving…" : "Receive"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
