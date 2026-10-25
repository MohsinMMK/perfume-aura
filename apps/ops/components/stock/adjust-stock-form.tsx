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
import { adjustStockAction } from "@/lib/stock";
import { FormField, TextAreaField } from "@/components/form-field";

type VariantOption = {
  id: string;
  label: string;
};

type Props = {
  variants: VariantOption[];
  defaultVariantId?: string;
};

export function AdjustStockForm({ variants, defaultVariantId }: Props) {
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
      idempotencyKeyRef.current = null;
      setSuccess(`Adjusted. On hand now: ${result.data?.quantityAfter}`);
      (e.target as HTMLFormElement).reset();
      setVariantId(defaultVariantId ?? "");
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
      <form onSubmit={onSubmit}>
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={2}>Adjust stock</Heading>
            <Text color="secondary">
              Signed delta (+ add / − remove). A note is required for the ledger.
            </Text>
          </VStack>
          <div className="grid gap-4 sm:grid-cols-2">
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
              containerClassName="sm:col-span-2"
            />
            <FormField
              label="Delta"
              name="quantityDelta"
              id={`${fieldId}-quantityDelta`}
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
              id={`${fieldId}-note`}
              required
              placeholder="Reason for adjustment…"
              error={fe("note")}
              rows={2}
              className="sm:col-span-2"
            />
            {error ? (
              <div className="sm:col-span-2">
                <Banner status="error" title={error} />
              </div>
            ) : null}
            {success ? (
              <div className="sm:col-span-2" role="status">
                <Text color="secondary">{success}</Text>
              </div>
            ) : null}
          </div>
          <HStack justify="end">
            <Button
              type="submit"
              variant="secondary"
              label={pending ? "Saving…" : "Apply adjustment"}
              isLoading={pending}
            />
          </HStack>
        </VStack>
      </form>
    </Card>
  );
}
