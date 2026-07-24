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
import { createInvoiceDraftAction } from "@/lib/invoices";
import { TextAreaField } from "@/components/form-field";

export function CreateInvoiceForm({
  customers,
  initialCustomerId,
}: {
  customers: { id: string; name: string }[];
  initialCustomerId?: string;
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
    let result: Awaited<ReturnType<typeof createInvoiceDraftAction>>;
    try {
      result = await createInvoiceDraftAction({
        customerId: String(fd.get("customerId") ?? ""),
        notes: String(fd.get("notes") ?? "").trim(),
      });
    } catch {
      setError("The invoice draft could not be created");
      setPending(false);
      return;
    }
    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      setPending(false);
      return;
    }
    router.push(`/invoices/${result.data!.invoiceId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>New invoice draft</CardTitle>
          <CardDescription>
            Pick a customer, then add lines on the next screen. Stock is not
            changed until you fulfill.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="gap-4">
          <Field data-invalid={Boolean(fieldErrors.customerId?.[0])}>
            <FieldLabel htmlFor="customerId">Customer</FieldLabel>
            <NativeSelect
              id="customerId"
              name="customerId"
              required
              className="w-full"
              defaultValue={
                customers.some((customer) => customer.id === initialCustomerId)
                  ? initialCustomerId
                  : ""
              }
              aria-invalid={Boolean(fieldErrors.customerId?.[0])}
            >
              <NativeSelectOption value="" disabled>
                Select customer…
              </NativeSelectOption>
              {customers.map((c) => (
                <NativeSelectOption key={c.id} value={c.id}>
                  {c.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError>{fieldErrors.customerId?.[0]}</FieldError>
          </Field>
          <TextAreaField
            label="Notes"
            name="notes"
            error={fieldErrors.notes?.[0]}
          />
          {error ? <FieldError>{error}</FieldError> : null}
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            disabled={pending || customers.length === 0}
            focusableWhenDisabled={pending}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Create draft
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
