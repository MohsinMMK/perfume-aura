"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
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
import { receiveOilAction } from "@/lib/oil";
import { FormField, TextAreaField } from "@/components/form-field";

type Props = {
  products: { id: string; name: string }[];
  canViewCost: boolean;
};

export function ReceiveOilForm({ products, canViewCost }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const idempotencyKeyRef = useRef<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    idempotencyKeyRef.current ??= crypto.randomUUID();
    try {
      const result = await receiveOilAction({
        idempotencyKey: idempotencyKeyRef.current,
        productId: String(form.get("productId") ?? ""),
        kgBottles: Number(form.get("kgBottles")),
        supplierName: String(form.get("supplierName") ?? "").trim(),
        supplierReference: String(form.get("supplierReference") ?? "").trim(),
        totalCost:
          String(form.get("totalCost") ?? "").trim() === ""
            ? undefined
            : Number(form.get("totalCost")),
        receivedDate: String(form.get("receivedDate") ?? "").trim(),
        note: String(form.get("note") ?? "").trim(),
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        setPending(false);
        return;
      }
      idempotencyKeyRef.current = null;
      setSuccess(
        `Received. This lot now holds ${result.data?.remainingQuantityMl ?? 0} ml oil.`,
      );
      event.currentTarget.reset();
      router.refresh();
    } catch {
      setError("The oil receive could not be saved");
    }
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Receive 1 kg oil</CardTitle>
          <CardDescription>
            One original bottle is stored as 1000 ml. Sales later take oil from
            the oldest lot first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="gap-4">
            <Field data-invalid={Boolean(fieldErrors.productId?.[0])}>
              <FieldLabel htmlFor="productId">Perfume oil</FieldLabel>
              <NativeSelect
                id="productId"
                name="productId"
                required
                className="w-full min-h-11"
                aria-invalid={Boolean(fieldErrors.productId?.[0])}
              >
                <NativeSelectOption value="" disabled>
                  Select perfume…
                </NativeSelectOption>
                {products.map((product) => (
                  <NativeSelectOption key={product.id} value={product.id}>
                    {product.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError>{fieldErrors.productId?.[0]}</FieldError>
            </Field>
            <FormField
              label="1 kg bottles received"
              name="kgBottles"
              type="number"
              min={1}
              step={1}
              required
              error={fieldErrors.kgBottles?.[0]}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Supplier"
                name="supplierName"
                placeholder="Supplier or seller"
                error={fieldErrors.supplierName?.[0]}
              />
              <FormField
                label="Purchase reference"
                name="supplierReference"
                placeholder="Bill, batch, or PO number"
                error={fieldErrors.supplierReference?.[0]}
              />
              {canViewCost ? (
                <FormField
                  label="Total purchase cost (INR)"
                  name="totalCost"
                  type="number"
                  min={0}
                  step="0.01"
                  error={fieldErrors.totalCost?.[0]}
                />
              ) : null}
              <FormField
                label="Received date"
                name="receivedDate"
                type="date"
                error={fieldErrors.receivedDate?.[0]}
              />
            </div>
            <TextAreaField
              label="Internal note"
              name="note"
              error={fieldErrors.note?.[0]}
            />
            {error ? <FieldError>{error}</FieldError> : null}
            {success ? (
              <p className="text-sm text-muted-foreground">{success}</p>
            ) : null}
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            disabled={pending || products.length === 0}
            focusableWhenDisabled={pending}
            className="min-h-11"
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Receive oil
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
