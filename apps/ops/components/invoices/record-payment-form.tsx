"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { recordPaymentAction } from "@/lib/payments";
import { FormField, TextAreaField } from "@/components/form-field";
import { toast } from "@perfume-aura/ui/components/sonner";

export function RecordPaymentForm({
  invoiceId,
  balanceRupees,
}: {
  invoiceId: string;
  balanceRupees: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const requestRef = useRef<{
    idempotencyKey: string;
    paidAt: string;
  } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    requestRef.current ??= {
      idempotencyKey: crypto.randomUUID(),
      paidAt: String(fd.get("paidAt") ?? "") || new Date().toISOString(),
    };
    let result: Awaited<ReturnType<typeof recordPaymentAction>>;
    try {
      result = await recordPaymentAction({
        invoiceId,
        idempotencyKey: requestRef.current.idempotencyKey,
        amount: Number(fd.get("amount")),
        method: String(fd.get("method") ?? "cash") as
          | "cash"
          | "bank_transfer"
          | "card"
          | "other",
        paidAt: requestRef.current.paidAt,
        reference: String(fd.get("reference") ?? "").trim() || undefined,
        note: String(fd.get("note") ?? "").trim() || undefined,
      });
    } catch {
      const message = "The payment could not be recorded";
      setError(message);
      toast.error(message);
      setPending(false);
      return;
    }
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      toast.error(result.error);
      return;
    }
    requestRef.current = null;
    toast.success(
      result.data?.fullyPaid
        ? "Payment recorded — invoice fully paid"
        : "Partial payment recorded",
    );
    router.refresh();
  }

  const defaultAmount =
    balanceRupees > 0 ? String(Number(balanceRupees.toFixed(2))) : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Record payment</CardTitle>
        <CardDescription>
          Manual cash / bank / card. Does not change stock. Balance:{" "}
          <span className="font-medium text-foreground">
            Rs {balanceRupees.toFixed(2)}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup className="gap-3">
          <FieldGroup className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Amount (Rs)"
              name="amount"
              type="number"
              step="0.01"
              min={0.01}
              required
              defaultValue={defaultAmount}
              error={fieldErrors.amount?.[0]}
            />
            <Field data-invalid={Boolean(fieldErrors.method?.[0])}>
              <FieldLabel htmlFor="method">Method</FieldLabel>
              <NativeSelect
                id="method"
                name="method"
                defaultValue="cash"
                className="w-full"
                aria-invalid={Boolean(fieldErrors.method?.[0])}
              >
                <NativeSelectOption value="cash">Cash</NativeSelectOption>
                <NativeSelectOption value="bank_transfer">
                  Bank transfer
                </NativeSelectOption>
                <NativeSelectOption value="card">Card</NativeSelectOption>
                <NativeSelectOption value="other">Other</NativeSelectOption>
              </NativeSelect>
              <FieldError>{fieldErrors.method?.[0]}</FieldError>
            </Field>
            <FormField
              label="Paid at"
              name="paidAt"
              type="datetime-local"
              error={fieldErrors.paidAt?.[0]}
            />
            <FormField
              label="Reference"
              name="reference"
              placeholder="Bank ref / cheque #"
              error={fieldErrors.reference?.[0]}
            />
          </FieldGroup>
          <TextAreaField
            label="Note"
            name="note"
            rows={2}
            error={fieldErrors.note?.[0]}
          />
          {error ? <FieldError>{error}</FieldError> : null}
          <Button
            type="submit"
            disabled={pending || balanceRupees <= 0}
            focusableWhenDisabled={pending}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Record payment
          </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
