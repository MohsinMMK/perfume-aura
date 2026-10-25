"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack } from "@astryxdesign/core/HStack";
import { Heading } from "@astryxdesign/core/Heading";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { receiveStockAction } from "@/lib/stock";
import { FormField, TextAreaField } from "@/components/form-field";
import { cn } from "@/lib/cn";

type VariantOption = {
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
  const fieldId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [variantId, setVariantId] = useState(defaultVariantId ?? "");
  const idempotencyKeyRef = useRef<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    const fd = new FormData(e.currentTarget);
    idempotencyKeyRef.current ??= crypto.randomUUID();
    const payload = {
      idempotencyKey: idempotencyKeyRef.current,
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
      idempotencyKeyRef.current = null;
      setSuccess(`Received. On hand now: ${result.data?.quantityAfter}`);
      (e.target as HTMLFormElement).reset();
      setVariantId(defaultVariantId ?? "");
      setPending(false);
      router.refresh();
    } catch {
      setError("Receive failed");
      setPending(false);
    }
  }

  const fe = (key: string) => fieldErrors[key]?.[0];
  const span = compact ? undefined : "sm:col-span-2";

  if (variants.length === 0) {
    return (
      <Card>
        <VStack gap={1}>
          <Heading level={2}>{title}</Heading>
          <Text color="secondary">
            No active variants yet. Create a product first.
          </Text>
        </VStack>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={2}>{title}</Heading>
            <Text color="secondary">{description}</Text>
          </VStack>
          <div
            className={
              compact ? "grid gap-3" : "grid gap-4 sm:grid-cols-2"
            }
          >
            <Selector
              label="Variant"
              htmlName="variantId"
              options={variants.map((v) => ({ value: v.id, label: v.label }))}
              value={variantId}
              onChange={setVariantId}
              placeholder="Select SKU…"
              hasSearch
              isRequired
              width="100%"
              status={
                fe("variantId")
                  ? { type: "error", message: fe("variantId") }
                  : undefined
              }
              containerClassName={cn(span)}
            />
            <FormField
              label="Quantity"
              name="quantity"
              id={`${fieldId}-quantity`}
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
              id={`${fieldId}-note`}
              placeholder="Optional — PO ref, supplier…"
              error={fe("note")}
              rows={2}
              className={span}
            />
            {error ? (
              <div className={span}>
                <Banner status="error" title={error} />
              </div>
            ) : null}
            {success ? (
              <div className={span} role="status">
                <Text color="secondary">{success}</Text>
              </div>
            ) : null}
          </div>
          <HStack justify="end">
            <Button
              type="submit"
              variant="primary"
              label={pending ? "Receiving…" : "Receive"}
              isLoading={pending}
            />
          </HStack>
        </VStack>
      </form>
    </Card>
  );
}
