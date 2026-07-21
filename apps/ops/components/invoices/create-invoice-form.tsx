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
  NativeSelect,
  NativeSelectOption,
} from "@perfume-aura/ui/components/native-select";
import { Spinner } from "@perfume-aura/ui/components/spinner";
import { createInvoiceDraftAction } from "@/lib/invoices";
import { TextAreaField } from "@/components/form-field";

export function CreateInvoiceForm({
  customers,
}: {
  customers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = await createInvoiceDraftAction({
      customerId: String(fd.get("customerId") ?? ""),
      notes: String(fd.get("notes") ?? "").trim(),
    });
    if (!result.ok) {
      setError(result.error);
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
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="customerId">
              Customer
            </label>
            <NativeSelect
              id="customerId"
              name="customerId"
              required
              className="w-full"
              defaultValue=""
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
          </div>
          <TextAreaField label="Notes" name="notes" />
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending || customers.length === 0}>
            {pending ? <Spinner /> : null}
            Create draft
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
