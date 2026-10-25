"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { recordPaymentAction } from "@/lib/payments";
import { FormField, TextAreaField } from "@/components/form-field";

export function RecordPaymentForm({
  invoiceId,
  balanceRupees,
}: {
  invoiceId: string;
  balanceRupees: number;
}) {
  const router = useRouter();
  const showToast = useToast();
  const [method, setMethod] = useState("cash");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const requestRef = useRef<{
    idempotencyKey: string;
    paidAt: string;
  } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
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
      showToast({ body: message, type: "error" });
      setPending(false);
      return;
    }
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      showToast({ body: result.error, type: "error" });
      return;
    }
    requestRef.current = null;
    showToast({
      body: result.data?.fullyPaid
        ? "Payment recorded — invoice fully paid"
        : "Partial payment recorded",
    });
    router.refresh();
  }

  const defaultAmount =
    balanceRupees > 0 ? String(Number(balanceRupees.toFixed(2))) : "";

  const methodError = fieldErrors.method?.[0];

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={2}>Record payment</Heading>
            <Text color="secondary">
              Manual cash / bank / card. Does not change stock. Balance:{" "}
              <span className="font-medium tabular-nums text-primary">
                ₹{balanceRupees.toFixed(2)}
              </span>
            </Text>
          </VStack>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Amount (INR)"
              name="amount"
              type="number"
              step="0.01"
              min={0.01}
              required
              defaultValue={defaultAmount}
              error={fieldErrors.amount?.[0]}
            />
            <Selector
              label="Method"
              htmlName="method"
              width="100%"
              value={method}
              onChange={setMethod}
              options={[
                { value: "cash", label: "Cash" },
                { value: "bank_transfer", label: "Bank transfer" },
                { value: "card", label: "Card" },
                { value: "other", label: "Other" },
              ]}
              status={methodError ? { type: "error", message: methodError } : undefined}
            />
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
          </div>
          <TextAreaField
            label="Note"
            name="note"
            rows={2}
            error={fieldErrors.note?.[0]}
          />
          {error ? <Banner status="error" title={error} role="alert" /> : null}
          <HStack gap={2}>
            <Button
              type="submit"
              label="Record payment"
              variant="primary"
              isLoading={pending}
              isDisabled={balanceRupees <= 0}
            />
          </HStack>
        </VStack>
      </form>
    </Card>
  );
}
