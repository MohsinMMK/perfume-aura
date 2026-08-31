"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@perfume-aura/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@perfume-aura/ui/components/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@perfume-aura/ui/components/field";
import { NativeSelect, NativeSelectOption } from "@perfume-aura/ui/components/native-select";
import { Spinner } from "@perfume-aura/ui/components/spinner";
import { FormField, TextAreaField } from "@/components/form-field";
import { receiveInvoiceReturnAction } from "@/lib/invoices";

type ReturnableLine = {
  id: string;
  description: string;
  quantityReturnable: number;
};

export function ReceiveReturnForm({
  invoiceId,
  lines,
}: {
  invoiceId: string;
  lines: ReturnableLine[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const idempotencyKeyRef = useRef<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    idempotencyKeyRef.current ??= crypto.randomUUID();
    setPending(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});
    try {
      const result = await receiveInvoiceReturnAction({
        invoiceId,
        lineId: String(form.get("lineId") ?? ""),
        quantity: Number(form.get("quantity")),
        reason: String(form.get("reason") ?? ""),
        idempotencyKey: idempotencyKeyRef.current,
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        setPending(false);
        return;
      }
      idempotencyKeyRef.current = null;
      setSuccess(`Return received. Finished stock is now ${result.data?.quantityAfter ?? 0}.`);
      event.currentTarget.reset();
      router.refresh();
    } catch {
      setError("The return could not be saved");
    }
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receive a returned bottle</CardTitle>
          <CardDescription>
            Finished stock increases. Oil is not restored, and any refund must be handled separately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="gap-4 sm:grid sm:grid-cols-2">
            <Field data-invalid={Boolean(fieldErrors.lineId?.[0])} className="sm:col-span-2">
              <FieldLabel htmlFor="lineId">Product</FieldLabel>
              <NativeSelect id="lineId" name="lineId" required className="min-h-11 w-full">
                <NativeSelectOption value="" disabled>Select fulfilled product…</NativeSelectOption>
                {lines.map((line) => (
                  <NativeSelectOption key={line.id} value={line.id}>
                    {line.description} · {line.quantityReturnable} returnable
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError>{fieldErrors.lineId?.[0]}</FieldError>
            </Field>
            <FormField label="Quantity" name="quantity" type="number" min={1} step={1} required error={fieldErrors.quantity?.[0]} />
            <TextAreaField label="Reason" name="reason" required className="sm:col-span-2" error={fieldErrors.reason?.[0]} />
            {error ? <FieldError className="sm:col-span-2">{error}</FieldError> : null}
            {success ? <p className="text-sm text-muted-foreground sm:col-span-2">{success}</p> : null}
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type="submit" variant="outline" disabled={pending || lines.length === 0} focusableWhenDisabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Receive return
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
