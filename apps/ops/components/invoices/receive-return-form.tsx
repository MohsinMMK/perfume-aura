"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
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
  const [lineId, setLineId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const idempotencyKeyRef = useRef<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
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
      formElement.reset();
      setLineId("");
      router.refresh();
    } catch {
      setError("The return could not be saved");
    }
    setPending(false);
  }

  const lineError = fieldErrors.lineId?.[0];

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={2}>Receive a returned bottle</Heading>
            <Text color="secondary">
              Finished stock increases. Oil is not restored, and any refund must be handled separately.
            </Text>
          </VStack>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Selector
                label="Product"
                htmlName="lineId"
                isRequired
                width="100%"
                placeholder="Select fulfilled product…"
                value={lineId}
                onChange={setLineId}
                options={lines.map((line) => ({
                  value: line.id,
                  label: `${line.description} · ${line.quantityReturnable} returnable`,
                }))}
                status={lineError ? { type: "error", message: lineError } : undefined}
              />
            </div>
            <FormField label="Quantity" name="quantity" type="number" min={1} step={1} required error={fieldErrors.quantity?.[0]} />
            <TextAreaField label="Reason" name="reason" required className="sm:col-span-2" error={fieldErrors.reason?.[0]} />
          </div>
          {error ? <Banner status="error" title={error} role="alert" /> : null}
          {success ? <Banner status="success" title={success} role="status" /> : null}
          <HStack gap={2}>
            <Button
              type="submit"
              label="Receive return"
              variant="secondary"
              isLoading={pending}
              isDisabled={lines.length === 0}
            />
          </HStack>
        </VStack>
      </Card>
    </form>
  );
}
