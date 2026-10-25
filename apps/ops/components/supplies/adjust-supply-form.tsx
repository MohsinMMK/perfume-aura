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
import { adjustSupplyAction } from "@/lib/production";
import {
  supplyOptionLabel,
  supplyUnit,
  type SupplyOption,
} from "@/components/supplies/supply-options";

export function AdjustSupplyForm({ supplies }: { supplies: SupplyOption[] }) {
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
      quantityDelta: Number(form.get("quantityDelta")),
      note: String(form.get("note") ?? "").trim(),
    };
    try {
      const result = await adjustSupplyAction(payload);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        setPending(false);
        return;
      }
      idempotencyKeyRef.current = null;
      setSuccess(`Adjusted. On hand now: ${result.data?.quantityAfter ?? 0} ${unit}.`);
      formElement.reset();
      setSupplyId("");
      router.refresh();
    } catch {
      setError("The adjustment could not be saved");
    }
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={2}>Adjust a count</Heading>
            <Text color="secondary">
              For breakage, spills and recounts. Use a minus sign to remove.
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
            placeholder="Select a supply…"
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
            label={`Change (${unit})`}
            name="quantityDelta"
            type="number"
            step={1}
            required
            placeholder="-2"
            error={fieldErrors.quantityDelta?.[0]}
          />
          <TextAreaField
            label="Reason"
            name="note"
            id="adjust-supply-note"
            required
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
              variant="secondary"
              label="Save adjustment"
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
