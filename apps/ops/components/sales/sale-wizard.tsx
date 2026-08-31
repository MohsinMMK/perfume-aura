"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@perfume-aura/ui/components/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@perfume-aura/ui/components/native-select";
import { Spinner } from "@perfume-aura/ui/components/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@perfume-aura/ui/components/table";
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
      return [
        {
          ...item,
          quantity: line.quantity,
          oilMl: Math.ceil((item.sizeMl * line.quantity * 50) / 100),
        },
      ];
    });
    const oil = [
      ...resolved
        .reduce((byProduct, line) => {
          const current = byProduct.get(line.productId);
          byProduct.set(line.productId, {
            productName: line.productName,
            oilMl: (current?.oilMl ?? 0) + line.oilMl,
            remainingOilMl: line.remainingOilMl,
          });
          return byProduct;
        }, new Map<string, { productName: string; oilMl: number; remainingOilMl: number }>())
        .values(),
    ];
    return {
      lines: resolved,
      oil,
      totalCents: resolved.reduce(
        (total, line) => total + line.retailCents * line.quantity,
        0,
      ),
    };
  }, [catalogById, lines]);

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
        ? lines.length > 0
        : true;

  return (
    <Card>
      <CardHeader>
        <CardTitle>New sale</CardTitle>
        <CardDescription>
          Step {step + 1} of {steps.length}: {steps[step]}. Oil leaves the 1 kg
          bottle when you confirm.
        </CardDescription>
        <ol className="flex flex-wrap gap-2 pt-2 text-sm">
          {steps.map((label, index) => (
            <li
              key={label}
              className={
                index === step
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              }
            >
              {index + 1}. {label}
            </li>
          ))}
        </ol>
      </CardHeader>
      <CardContent>
        {step === 0 ? (
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="customerMode">Customer</FieldLabel>
              <NativeSelect
                id="customerMode"
                className="min-h-11 w-full"
                value={customerMode}
                onChange={(event) =>
                  setCustomerMode(event.target.value === "new" ? "new" : "existing")
                }
              >
                <NativeSelectOption value="existing" disabled={customers.length === 0}>
                  Existing customer
                </NativeSelectOption>
                <NativeSelectOption value="new">New customer</NativeSelectOption>
              </NativeSelect>
            </Field>
            {customerMode === "existing" ? (
              <Field data-invalid={Boolean(fieldErrors.customerId?.[0])}>
                <FieldLabel htmlFor="customerId">Name</FieldLabel>
                <NativeSelect
                  id="customerId"
                  className="min-h-11 w-full"
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                >
                  {customers.map((customer) => (
                    <NativeSelectOption key={customer.id} value={customer.id}>
                      {customer.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError>{fieldErrors.customerId?.[0]}</FieldError>
              </Field>
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
          </FieldGroup>
        ) : null}

        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <FieldGroup className="gap-4 sm:grid sm:grid-cols-[1fr_8rem_auto] sm:items-end">
              <Field>
                <FieldLabel htmlFor="variantId">Product</FieldLabel>
                <NativeSelect
                  id="variantId"
                  className="min-h-11 w-full"
                  value={selectedVariantId}
                  onChange={(event) => setSelectedVariantId(event.target.value)}
                >
                  {catalog.map((item) => (
                    <NativeSelectOption key={item.variantId} value={item.variantId}>
                      {item.productName} · {item.sizeMl} ml · {item.sku}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
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
                variant="outline"
                className="min-h-11"
                onClick={() => {
                  addLine();
                }}
              >
                Add
              </Button>
            </FieldGroup>
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add the bottles this person is buying.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Oil</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.lines.map((line) => (
                    <TableRow key={line.variantId}>
                      <TableCell>
                        {line.productName} · {line.sizeMl} ml
                      </TableCell>
                      <TableCell className="text-right">
                        {formatQty(line.quantity)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatQty(line.oilMl)} ml
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          className="min-h-11"
                          onClick={() => removeLine(line.variantId)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        ) : null}

        {step === 2 || step === 3 ? (
          <div className="flex flex-col gap-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Oil used</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.lines.map((line) => (
                  <TableRow key={line.variantId}>
                    <TableCell>
                      {line.productName} · {line.sizeMl} ml
                    </TableCell>
                    <TableCell className="text-right">
                      {formatQty(line.quantity)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatQty(line.oilMl)} ml
                    </TableCell>
                    <TableCell className="text-right">
                      {formatInr(line.retailCents * line.quantity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ul className="text-sm text-muted-foreground">
              {preview.oil.map((row) => (
                <li key={row.productName}>
                  {row.productName}: {formatQty(row.oilMl)} ml oil leaves the 1 kg
                  bottle. {formatQty(Math.max(0, row.remainingOilMl - row.oilMl))} ml
                  remains.
                </li>
              ))}
            </ul>
            <p className="text-sm font-medium">Total {formatInr(preview.totalCents)}</p>
            {step === 3 && canRecordPayment ? (
              <div className="rounded-lg border p-4">
                <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={recordPayment}
                    onChange={(event) => setRecordPayment(event.target.checked)}
                  />
                  Record full payment now
                </label>
                {recordPayment ? (
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="paymentMethod">Payment method</FieldLabel>
                      <NativeSelect
                        id="paymentMethod"
                        className="min-h-11 w-full"
                        value={paymentMethod}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (
                            value === "cash" ||
                            value === "bank_transfer" ||
                            value === "card" ||
                            value === "other"
                          ) {
                            setPaymentMethod(value);
                          }
                        }}
                      >
                        <NativeSelectOption value="cash">Cash</NativeSelectOption>
                        <NativeSelectOption value="bank_transfer">Bank transfer / UPI</NativeSelectOption>
                        <NativeSelectOption value="card">Card</NativeSelectOption>
                        <NativeSelectOption value="other">Other</NativeSelectOption>
                      </NativeSelect>
                    </Field>
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
              </div>
            ) : null}
          </div>
        ) : null}
        {error ? <FieldError className="mt-4">{error}</FieldError> : null}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {step > 0 ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => {
              setError(null);
              setStep((current) => current - 1);
            }}
          >
            Back
          </Button>
        ) : null}
        {step < 3 ? (
          <Button
            type="button"
            className="min-h-11"
            disabled={!canNext}
            onClick={() => {
              setError(null);
              setStep((current) => current + 1);
            }}
          >
            Continue
          </Button>
        ) : (
          <form onSubmit={onConfirm}>
            <Button
              type="submit"
              className="min-h-11"
              disabled={pending || preview.lines.length === 0}
              focusableWhenDisabled={pending}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Confirm sale
            </Button>
          </form>
        )}
      </CardFooter>
    </Card>
  );
}
