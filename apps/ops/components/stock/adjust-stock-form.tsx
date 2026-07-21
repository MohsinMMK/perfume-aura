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
import { adjustStockAction } from "@/lib/stock";
import { FormField, TextAreaField } from "@/components/form-field";

export type VariantOption = {
  id: string;
  label: string;
};

type Props = {
  variants: VariantOption[];
  defaultVariantId?: string;
};

export function AdjustStockForm({ variants, defaultVariantId }: Props) {
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
      quantityDelta: Number(fd.get("quantityDelta")),
      note: String(fd.get("note") ?? "").trim(),
    };

    try {
      const result = await adjustStockAction(payload);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        setPending(false);
        return;
      }
      setSuccess(`Adjusted. On hand now: ${result.data?.quantityAfter}`);
      (e.target as HTMLFormElement).reset();
      setPending(false);
      router.refresh();
    } catch {
      setError("Adjust failed");
      setPending(false);
    }
  }

  const fe = (key: string) => fieldErrors[key]?.[0];

  if (variants.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adjust stock</CardTitle>
        <CardDescription>
          Signed delta (+ add / − remove). A note is required for the ledger.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent>
          <FieldGroup className="gap-4 sm:grid sm:grid-cols-2 sm:gap-4">
            <Field
              data-invalid={fe("variantId") ? true : undefined}
              className="sm:col-span-2"
            >
              <FieldLabel htmlFor="adjust-variantId">
                Variant <span className="text-destructive">*</span>
              </FieldLabel>
              <NativeSelect
                id="adjust-variantId"
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
              label="Delta"
              name="quantityDelta"
              type="number"
              required
              step={1}
              placeholder="+2 or -1"
              hint="Non-zero whole number"
              error={fe("quantityDelta")}
            />
            <TextAreaField
              label="Note"
              name="note"
              required
              placeholder="Reason for adjustment…"
              error={fe("note")}
              rows={2}
              className="sm:col-span-2"
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
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Saving…" : "Apply adjustment"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
