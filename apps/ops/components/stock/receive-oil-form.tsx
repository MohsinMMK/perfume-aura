"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
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
  const [productId, setProductId] = useState("");
  const idempotencyKeyRef = useRef<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // React clears currentTarget once the handler yields, so keep the form.
    const formElement = event.currentTarget;
    setPending(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});
    const form = new FormData(formElement);
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
      formElement.reset();
      setProductId("");
      router.refresh();
    } catch {
      setError("The oil receive could not be saved");
    }
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={2}>Receive oil</Heading>
            <Text color="secondary">
              One original bottle is stored as 1000 ml. Sales later take oil
              from the oldest lot first.
            </Text>
          </VStack>
          <VStack gap={4}>
            <Selector
              label="Perfume oil"
              htmlName="productId"
              options={products.map((product) => ({
                value: product.id,
                label: product.name,
              }))}
              value={productId}
              onChange={setProductId}
              placeholder="Select perfume…"
              hasSearch
              isRequired
              width="100%"
              status={
                fieldErrors.productId?.[0]
                  ? { type: "error", message: fieldErrors.productId[0] }
                  : undefined
              }
              controlClassName="min-h-11"
            />
            <FormField
              label="1 kg / 1 L bottles received"
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
              id="receive-oil-note"
              error={fieldErrors.note?.[0]}
            />
            {error ? <Banner status="error" title={error} /> : null}
            {success ? (
              <div role="status">
                <Text color="secondary">{success}</Text>
              </div>
            ) : null}
          </VStack>
          <div>
            <Button
              type="submit"
              variant="primary"
              label="Receive oil"
              isLoading={pending}
              isDisabled={products.length === 0}
              className="min-h-11"
            />
          </div>
        </VStack>
      </Card>
    </form>
  );
}
