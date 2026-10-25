"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
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
  const [customerId, setCustomerId] = useState(
    customers.some((customer) => customer.id === initialCustomerId)
      ? (initialCustomerId ?? "")
      : "",
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
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

  const customerError = fieldErrors.customerId?.[0];

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-lg">
      <Card>
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={1}>New invoice draft</Heading>
            <Text as="p" color="secondary">
              Pick a customer, then add lines on the next screen. Stock is not
              changed until you fulfill.
            </Text>
          </VStack>
          <Selector
            label="Customer"
            htmlName="customerId"
            isRequired
            width="100%"
            placeholder="Select customer…"
            value={customerId}
            onChange={setCustomerId}
            options={customers.map((c) => ({ value: c.id, label: c.name }))}
            status={
              customerError ? { type: "error", message: customerError } : undefined
            }
          />
          <TextAreaField
            label="Notes"
            name="notes"
            error={fieldErrors.notes?.[0]}
          />
          {error ? <Banner status="error" title={error} role="alert" /> : null}
          <HStack justify="end" gap={2}>
            <Button
              type="submit"
              label="Create draft"
              variant="primary"
              isLoading={pending}
              isDisabled={customers.length === 0}
            />
          </HStack>
        </VStack>
      </Card>
    </form>
  );
}
