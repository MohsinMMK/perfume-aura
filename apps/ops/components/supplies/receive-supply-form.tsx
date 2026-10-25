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
import { FormField, TextAreaField } from "@/components/form-field";
import { receiveSupplyAction } from "@/lib/production";
import {
  supplyOptionLabel,
  supplyUnit,
  type SupplyOption,
} from "@/components/supplies/supply-options";

type Props = {
  supplies: SupplyOption[];
  canViewCost: boolean;
};

export function ReceiveSupplyForm({ supplies, canViewCost }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [supplyId, setSupplyId] = useState("");
  const idempotencyKeyRef = useRef<string | null>(null);
  const selected = supplies.find((supply) => supply.id === supplyId);
  const unit = selected ? supplyUnit(selected.kind) : "pcs or ml";

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
    const payload = {
      idempotencyKey: idempotencyKeyRef.current,
      supplyId: String(form.get("supplyId") ?? ""),
      quantity: Number(form.get("quantity")),
      supplierName: String(form.get("supplierName") ?? "").trim(),
      totalCost:
        String(form.get("totalCost") ?? "").trim() === ""
          ? undefined
          : Number(form.get("totalCost")),
      note: String(form.get("note") ?? "").trim(),
    };
    try {
      const result = await receiveSupplyAction(payload);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        setPending(false);
        return;
      }
      idempotencyKeyRef.current = null;
      setSuccess(
        `Received. ${selected?.name ?? "This supply"} now has ${result.data?.quantityAfter ?? 0} ${unit}.`,
      );
      formElement.reset();
      setSupplyId("");
      router.refresh();
    } catch {
      setError("The receipt could not be saved");
    }
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={2}>Receive supplies</Heading>
            <Text color="secondary">
              Empty bottles and boxes count in pieces. The base mixture counts in
              ml.
            </Text>
          </VStack>
          <Selector
            label="Supply"
            htmlName="supplyId"
            options={supplies.map((supply) => ({
              value: supply.id,
              label: supplyOptionLabel(supply),
            }))}
            value={supplyId}
            onChange={setSupplyId}
            placeholder="Select a bottle, box or the base…"
            hasSearch
            isRequired
            width="100%"
            status={
              fieldErrors.supplyId?.[0]
                ? { type: "error", message: fieldErrors.supplyId[0] }
                : undefined
            }
            controlClassName="min-h-11"
          />
          <FormField
            label={`Quantity received (${unit})`}
            name="quantity"
            type="number"
            min={1}
            step={1}
            required
            error={fieldErrors.quantity?.[0]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Supplier"
              name="supplierName"
              placeholder="Supplier or seller"
              error={fieldErrors.supplierName?.[0]}
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
          </div>
          <TextAreaField
            label="Internal note"
            name="note"
            id="receive-supply-note"
            error={fieldErrors.note?.[0]}
          />
          {error ? <Banner status="error" title={error} /> : null}
          {success ? (
            <div role="status">
              <Text color="secondary">{success}</Text>
            </div>
          ) : null}
          <div>
            <Button
              type="submit"
              variant="primary"
              label="Receive"
              isLoading={pending}
              isDisabled={supplies.length === 0}
              className="min-h-11"
            />
          </div>
        </VStack>
      </Card>
    </form>
  );
}
