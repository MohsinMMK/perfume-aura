"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { FormField, TextAreaField } from "@/components/form-field";
import { formatInr, formatQty } from "@/lib/money";
import { completeSaleAction } from "@/lib/sales";
import type { SaleCatalogItem } from "@/lib/sales";

type CustomerOption = { id: string; name: string };

type DraftLine = {
  variantId: string;
  quantity: number;
};

const steps = ["Customer", "Products", "Check", "Confirm"] as const;

export function SaleWizard({
  customers,
  catalog,
  canRecordPayment,
}: {
  customers: CustomerOption[];
  catalog: SaleCatalogItem[];
  canRecordPayment: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [customerMode, setCustomerMode] = useState<"existing" | "new">(
    customers.length > 0 ? "existing" : "new",
  );
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    addressLine: "",
    city: "",
    notes: "",
  });
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState(
    catalog[0]?.variantId ?? "",
  );
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [recordPayment, setRecordPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "bank_transfer" | "card" | "other"
  >("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const idempotencyKeyRef = useRef(crypto.randomUUID());
  const paymentKeyRef = useRef(crypto.randomUUID());

  const catalogById = useMemo(
    () => new Map(catalog.map((item) => [item.variantId, item])),
    [catalog],
  );

  const preview = useMemo(() => {
    const resolved = lines.flatMap((line) => {
      const item = catalogById.get(line.variantId);
      if (!item) return [];
      // Finished bottles go first; the server makes the rest from the recipe.
      const fromStock = Math.min(line.quantity, Math.max(0, item.quantityOnHand));
      const toMake = line.quantity - fromStock;
      const oilMl =
        toMake > 0 && item.concentrationPercent !== null
          ? Math.ceil((item.sizeMl * toMake * item.concentrationPercent) / 100)
          : 0;
      return [
        {
          ...item,
          quantity: line.quantity,
          fromStock,
          toMake,
          oilMl,
          baseMl: toMake > 0 && item.concentrationPercent !== null
            ? item.sizeMl * toMake - oilMl
            : 0,
          shortBy: Math.max(0, toMake - item.canMake),
        },
      ];
    });
    const oil = [
      ...resolved
        .filter((line) => line.oilMl > 0)
        .reduce((byProduct, line) => {
          const current = byProduct.get(line.productId);
          byProduct.set(line.productId, {
            productName: line.productName,
            oilMl: (current?.oilMl ?? 0) + line.oilMl,
            availableOilMl: line.availableOilMl,
            reservedOilMl: line.reservedOilMl,
          });
          return byProduct;
        }, new Map<string, {
          productName: string;
          oilMl: number;
          availableOilMl: number;
          reservedOilMl: number;
        }>())
        .values(),
    ];
    return {
      lines: resolved,
      oil,
      baseMl: resolved.reduce((total, line) => total + line.baseMl, 0),
      madeBottles: resolved.reduce((total, line) => total + line.toMake, 0),
      short: resolved.filter((line) => line.shortBy > 0),
      totalCents: resolved.reduce(
        (total, line) => total + line.retailCents * line.quantity,
        0,
      ),
    };
  }, [catalogById, lines]);

  const selectedItem = catalogById.get(selectedVariantId);

  function addLine() {
    const item = catalogById.get(selectedVariantId);
    if (!item || selectedQuantity < 1) return;
    setLines((current) => {
      const existing = current.find((line) => line.variantId === selectedVariantId);
      if (existing) {
        return current.map((line) =>
          line.variantId === selectedVariantId
            ? { ...line, quantity: line.quantity + selectedQuantity }
            : line,
        );
      }
      return [...current, { variantId: selectedVariantId, quantity: selectedQuantity }];
    });
  }

  function removeLine(variantId: string) {
    setLines((current) => current.filter((line) => line.variantId !== variantId));
  }

  async function onConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      const result = await completeSaleAction({
        idempotencyKey: idempotencyKeyRef.current,
        customerId: customerMode === "existing" ? customerId : "",
        name: newCustomer.name,
        email: newCustomer.email,
        phone: newCustomer.phone,
        addressLine: newCustomer.addressLine,
        city: newCustomer.city,
        customerNotes: newCustomer.notes,
        lines: preview.lines.map((line) => ({
          variantId: line.variantId,
          quantity: line.quantity,
        })),
        paymentAmount:
          canRecordPayment && recordPayment ? preview.totalCents / 100 : undefined,
        paymentMethod,
        paymentReference,
        paymentNote,
        paymentIdempotencyKey: paymentKeyRef.current,
        paidAt: new Date().toISOString(),
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        setPending(false);
        return;
      }
      router.push(`/invoices/${result.data!.invoiceId}`);
      router.refresh();
    } catch {
      setError("The sale could not be saved");
      setPending(false);
    }
  }

  const canNext =
    step === 0
      ? customerMode === "existing"
        ? Boolean(customerId)
        : newCustomer.name.trim().length > 0
      : step === 1
        ? lines.length > 0 && preview.short.length === 0
        : true;

  const customerIdError = fieldErrors.customerId?.[0];

  return (
    <Card>
      <VStack gap={6}>
        <VStack gap={2}>
          <Heading level={1}>New sale</Heading>
          <Text color="secondary">
            Step {step + 1} of {steps.length}: {steps[step]}. Finished bottles go
            first; the rest are made from oil, base and packaging when you confirm.
          </Text>
          <Stepper
            label="Sale steps"
            activeStep={step}
            density="compact"
            // Finished steps can be revisited; later ones open through Next.
            onStepClick={(index) => {
              if (index < step) setStep(index);
            }}
            horizontalOptions={{
              minimumStepWidth: 96,
              collapsedVariant: "withLabel",
            }}
          >
            {steps.map((label, index) => (
              <Step key={label} step={index} label={label} isDisabled={index > step} />
            ))}
          </Stepper>
        </VStack>

        {step === 0 ? (
          <VStack gap={4}>
            <Selector
              label="Customer"
              width="100%"
              value={customerMode}
              onChange={(value) =>
                setCustomerMode(value === "new" ? "new" : "existing")
              }
              options={[
                {
                  value: "existing",
                  label: "Existing customer",
                  disabled: customers.length === 0,
                },
                { value: "new", label: "New customer" },
              ]}
            />
            {customerMode === "existing" ? (
              <Selector
                label="Name"
                width="100%"
                value={customerId}
                onChange={setCustomerId}
                options={customers.map((customer) => ({
                  value: customer.id,
                  label: customer.name,
                }))}
                status={
                  customerIdError
                    ? { type: "error", message: customerIdError }
                    : undefined
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Name"
                  name="name"
                  required
                  value={newCustomer.name}
                  onChange={(value) =>
                    setNewCustomer((current) => ({ ...current, name: value }))
                  }
                  error={fieldErrors.name?.[0]}
                  inputClassName="min-h-11"
                />
                <FormField
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={newCustomer.email}
                  onChange={(value) =>
                    setNewCustomer((current) => ({ ...current, email: value }))
                  }
                  error={fieldErrors.email?.[0]}
                  inputClassName="min-h-11"
                />
                <FormField
                  label="Phone"
                  name="phone"
                  autoComplete="tel"
                  value={newCustomer.phone}
                  onChange={(value) =>
                    setNewCustomer((current) => ({ ...current, phone: value }))
                  }
                  error={fieldErrors.phone?.[0]}
                  inputClassName="min-h-11"
                />
                <FormField
                  label="City"
                  name="city"
                  value={newCustomer.city}
                  onChange={(value) =>
                    setNewCustomer((current) => ({ ...current, city: value }))
                  }
                  error={fieldErrors.city?.[0]}
                  inputClassName="min-h-11"
                />
                <FormField
                  label="Address"
                  name="addressLine"
                  autoComplete="street-address"
                  className="sm:col-span-2"
                  value={newCustomer.addressLine}
                  onChange={(value) =>
                    setNewCustomer((current) => ({ ...current, addressLine: value }))
                  }
                  error={fieldErrors.addressLine?.[0]}
                  inputClassName="min-h-11"
                />
                <TextAreaField
                  label="Customer note"
                  name="customerNotes"
                  className="sm:col-span-2"
                  value={newCustomer.notes}
                  onChange={(value) =>
                    setNewCustomer((current) => ({ ...current, notes: value }))
                  }
                  error={fieldErrors.customerNotes?.[0]}
                />
              </div>
            )}
          </VStack>
        ) : null}

        {step === 1 ? (
          <VStack gap={4}>
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
              <Selector
                label="Product"
                width="100%"
                value={selectedVariantId}
                onChange={setSelectedVariantId}
                options={catalog.map((item) => ({
                  value: item.variantId,
                  label: `${item.productName} · ${item.sizeMl} ml · ${item.quantityOnHand} in stock · can make ${item.canMake}`,
                }))}
              />
              <FormField
                label="Qty"
                name="quantity"
                type="number"
                min={1}
                step={1}
                value={selectedQuantity}
                onChange={(value) => {
                  const qty = Number(value);
                  if (Number.isInteger(qty) && qty > 0) setSelectedQuantity(qty);
                }}
              />
              <Button
                type="button"
                label="Add"
                variant="secondary"
                onClick={() => {
                  addLine();
                }}
              />
            </div>
            {selectedItem ? (
              <Text type="supporting" color="secondary">
                {selectedItem.seriesName ?? "No series"} · {formatQty(selectedItem.quantityOnHand)} finished
                {selectedItem.oilMlPerBottle !== null && selectedItem.baseMlPerBottle !== null
                  ? ` · one bottle uses ${formatQty(selectedItem.oilMlPerBottle)} ml oil and ${formatQty(selectedItem.baseMlPerBottle)} ml base`
                  : ""}
                {selectedItem.blocker
                  ? ` · can't make more: ${selectedItem.blocker}`
                  : ` · can make ${formatQty(selectedItem.canMake)} more${selectedItem.limitedBy ? ` (${selectedItem.limitedBy} runs out first)` : ""}`}
              </Text>
            ) : null}
            {lines.length === 0 ? (
              <Text color="secondary">Add the bottles this person is buying.</Text>
            ) : (
              <Card padding={0} className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Item</TableHeaderCell>
                      <TableHeaderCell className="text-right">Qty</TableHeaderCell>
                      <TableHeaderCell className="text-right">From stock</TableHeaderCell>
                      <TableHeaderCell className="text-right">Made now</TableHeaderCell>
                      <TableHeaderCell className="text-right">Oil</TableHeaderCell>
                      <TableHeaderCell className="text-right">
                        <span className="sr-only">Actions</span>
                      </TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.lines.map((line) => (
                      <TableRow key={line.variantId}>
                        <TableCell>
                          {line.productName} · {line.sizeMl} ml
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(line.quantity)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(line.fromStock)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(line.toMake)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(line.oilMl)} ml
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            label="Remove"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLine(line.variantId)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
            {preview.short.length > 0 ? (
              <Banner
                status="warning"
                title="Not enough to make these bottles"
                description={preview.short
                  .map((line) =>
                    line.blocker
                      ? `${line.productName} ${line.sizeMl} ml: ${line.blocker}`
                      : `${line.productName} ${line.sizeMl} ml: ${formatQty(line.fromStock + line.canMake)} available, ${line.limitedBy ?? "materials"} runs out first`,
                  )
                  .join(". ")}
              />
            ) : null}
          </VStack>
        ) : null}

        {step === 2 || step === 3 ? (
          <VStack gap={4}>
            <Card padding={0} className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Item</TableHeaderCell>
                    <TableHeaderCell className="text-right">Qty</TableHeaderCell>
                    <TableHeaderCell className="text-right">Oil used</TableHeaderCell>
                    <TableHeaderCell className="text-right">Price</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.lines.map((line) => (
                    <TableRow key={line.variantId}>
                      <TableCell>
                        {line.productName} · {line.sizeMl} ml
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(line.quantity)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(line.oilMl)} ml
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatInr(line.retailCents * line.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            <ul className="flex flex-col gap-1 text-sm text-secondary">
              {preview.oil.map((row) => (
                <li key={row.productName}>
                  {row.productName}: {formatQty(row.oilMl)} ml oil goes into new
                  bottles. {formatQty(Math.max(0, row.availableOilMl - row.oilMl))} ml
                  remains available
                  {row.reservedOilMl > 0
                    ? ` (${formatQty(row.reservedOilMl)} ml held for storefront checkouts)`
                    : ""}.
                </li>
              ))}
              {preview.madeBottles > 0 ? (
                <li>
                  {formatQty(preview.madeBottles)}{" "}
                  {preview.madeBottles === 1 ? "bottle is" : "bottles are"} made now,
                  using {formatQty(preview.baseMl)} ml base in total, plus one empty
                  bottle (and box, where the size has one) for each.
                </li>
              ) : (
                <li>Every bottle comes from finished stock.</li>
              )}
            </ul>
            <Text weight="semibold" hasTabularNumbers>
              Total {formatInr(preview.totalCents)}
            </Text>
            {step === 3 && canRecordPayment ? (
              <Card variant="muted">
                <VStack gap={4}>
                  <CheckboxInput
                    label="Record full payment now"
                    value={recordPayment}
                    onChange={setRecordPayment}
                  />
                  {recordPayment ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Selector
                        label="Payment method"
                        width="100%"
                        value={paymentMethod}
                        onChange={(value) => {
                          if (
                            value === "cash" ||
                            value === "bank_transfer" ||
                            value === "card" ||
                            value === "other"
                          ) {
                            setPaymentMethod(value);
                          }
                        }}
                        options={[
                          { value: "cash", label: "Cash" },
                          { value: "bank_transfer", label: "Bank transfer / UPI" },
                          { value: "card", label: "Card" },
                          { value: "other", label: "Other" },
                        ]}
                      />
                      <FormField
                        label="Reference"
                        name="paymentReference"
                        placeholder="UPI or transaction reference"
                        value={paymentReference}
                        onChange={setPaymentReference}
                        error={fieldErrors.paymentReference?.[0]}
                        inputClassName="min-h-11"
                      />
                      <TextAreaField
                        label="Payment note"
                        name="paymentNote"
                        className="sm:col-span-2"
                        rows={2}
                        value={paymentNote}
                        onChange={setPaymentNote}
                        error={fieldErrors.paymentNote?.[0]}
                      />
                    </div>
                  ) : null}
                </VStack>
              </Card>
            ) : null}
          </VStack>
        ) : null}
        {error ? <Banner status="error" title={error} role="alert" /> : null}

        <HStack gap={2} wrap="wrap">
          {step > 0 ? (
            <Button
              type="button"
              label="Back"
              variant="secondary"
              onClick={() => {
                setError(null);
                setStep((current) => current - 1);
              }}
            />
          ) : null}
          {step < 3 ? (
            <Button
              type="button"
              label="Continue"
              variant="primary"
              isDisabled={!canNext}
              onClick={() => {
                setError(null);
                setStep((current) => current + 1);
              }}
            />
          ) : (
            <form onSubmit={onConfirm}>
              <Button
                type="submit"
                label="Confirm sale"
                variant="primary"
                isLoading={pending}
                isDisabled={preview.lines.length === 0}
              />
            </form>
          )}
        </HStack>
      </VStack>
    </Card>
  );
}
