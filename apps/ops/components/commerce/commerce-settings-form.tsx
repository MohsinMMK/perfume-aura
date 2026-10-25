"use client";

import { useState, type FormEvent } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { FormField } from "@/components/form-field";
import { cn } from "@/lib/cn";
import { updateCommerceSettingsAction } from "@/lib/commerce";

type SettingsValue = {
  flatShippingAmountMinor: number | null;
  freeShippingThresholdMinor: number | null;
  taxTreatment: string | null;
  taxPolicyApproved: boolean;
  taxApprovalReference: string | null;
  catalogLegalApproved: boolean;
  legalApprovalReference: string | null;
  supportChannel: string | null;
  supportOperationsApproved: boolean;
  shippingPolicyApproved: boolean;
  returnsPolicyApproved: boolean;
  cancellationPolicyApproved: boolean;
  checkoutEnabled: boolean;
} | null;

function rupees(amountMinor: number | null | undefined) {
  return amountMinor == null ? "" : String(amountMinor / 100);
}

export function CommerceSettingsForm({ settings }: { settings: SettingsValue }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taxTreatment, setTaxTreatment] = useState(settings?.taxTreatment ?? "");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      const result = await updateCommerceSettingsAction(new FormData(event.currentTarget));
      if (!result.ok) {
        const firstFieldError = result.fieldErrors
          ? Object.values(result.fieldErrors).flat()[0]
          : undefined;
        setError(firstFieldError ?? result.error);
        return;
      }
      setMessage(
        result.data?.checkoutEnabled
          ? "Settings saved. Checkout is enabled at the business-policy layer."
          : "Settings saved. Checkout remains disabled.",
      );
    } catch {
      setError("Settings could not be saved. Check the database connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl">
      <Card>
        <VStack gap={6}>
          <VStack gap={1}>
            <Heading level={2}>India checkout policy gates</Heading>
            <Text as="p" color="secondary">
              Amounts are entered in INR and stored as integer paise. Provider credentials and
              legal approval are separate release gates.
            </Text>
          </VStack>
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              label="Flat delivery fee (INR)"
              name="flatShippingAmount"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={rupees(settings?.flatShippingAmountMinor)}
            />
            <FormField
              label="Free-shipping threshold (INR)"
              name="freeShippingThreshold"
              type="number"
              min="0"
              step="0.01"
              defaultValue={rupees(settings?.freeShippingThresholdMinor)}
              placeholder="Optional"
            />
            <div className="sm:col-span-2">
              <Selector
                id="taxTreatment"
                label="Approved tax treatment"
                htmlName="taxTreatment"
                isRequired
                placeholder="Select only after owner/legal approval"
                value={taxTreatment}
                onChange={(next) => setTaxTreatment(next)}
                options={[
                  { value: "prices_include_approved_tax", label: "Approved tax is included in listed prices" },
                  { value: "no_tax_collected_owner_approved", label: "No tax collected (owner/legal approved)" },
                ]}
                width="100%"
              />
            </div>
            <FormField className="sm:col-span-2" label="Tax approval reference" name="taxApprovalReference" defaultValue={settings?.taxApprovalReference ?? ""} placeholder="Approved decision or adviser reference" />
            <GateCheckbox className="sm:col-span-2" name="taxPolicyApproved" label="Tax treatment and evidence reference approved" defaultChecked={settings?.taxPolicyApproved ?? false} />
            <FormField
              className="sm:col-span-2"
              label="Approved customer support channel"
              name="supportChannel"
              required
              defaultValue={settings?.supportChannel ?? ""}
              placeholder="Email or phone approved for public policy pages"
            />
            <GateCheckbox className="sm:col-span-2" name="supportOperationsApproved" label="Support channel, staffing, and response operations approved" defaultChecked={settings?.supportOperationsApproved ?? false} />
            <FormField className="sm:col-span-2" label="Catalog legal approval reference" name="legalApprovalReference" defaultValue={settings?.legalApprovalReference ?? ""} placeholder="India-counsel evidence reference" />
            <GateCheckbox className="sm:col-span-2" name="catalogLegalApproved" label="Catalog naming, surfaces, and disclaimer treatment approved" defaultChecked={settings?.catalogLegalApproved ?? false} />
            <fieldset className="grid gap-3 sm:col-span-2">
              <legend className="mb-3 text-sm font-medium text-primary">Policy approvals</legend>
              {([
                ["shippingPolicyApproved", "Shipping policy approved", settings?.shippingPolicyApproved],
                ["returnsPolicyApproved", "Returns policy approved", settings?.returnsPolicyApproved],
                ["cancellationPolicyApproved", "Cancellation policy approved", settings?.cancellationPolicyApproved],
              ] as const).map(([name, label, checked]) => (
                <GateCheckbox key={name} name={name} label={label} defaultChecked={checked ?? false} />
              ))}
            </fieldset>
            <CheckoutSwitch defaultChecked={settings?.checkoutEnabled ?? false} />
            {error ? <div className="sm:col-span-2"><Banner status="error" title={error} role="alert" /></div> : null}
            {message ? <div className="sm:col-span-2"><Banner status="success" title={message} role="status" /></div> : null}
          </div>
          <HStack justify="end" gap={2}>
            <Button type="submit" variant="primary" label={pending ? "Saving…" : "Save checkout gates"} isLoading={pending} />
          </HStack>
        </VStack>
      </Card>
    </form>
  );
}

/** Controlled Astryx checkbox that still posts "on" under `name`, like the native one it replaces. */
function GateCheckbox({ name, label, defaultChecked, className }: Readonly<{ name: string; label: string; defaultChecked: boolean; className?: string }>) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className={cn("flex min-h-11 items-center rounded-md border border-border px-3", className)}>
      <CheckboxInput label={label} htmlName={name} value={checked} onChange={(next) => setChecked(next)} />
    </div>
  );
}

function CheckoutSwitch({ defaultChecked }: Readonly<{ defaultChecked: boolean }>) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="flex min-h-11 items-center rounded-md border border-warning bg-warning-muted px-3 sm:col-span-2">
      <Switch label="Enable checkout after all policy approvals are confirmed" htmlName="checkoutEnabled" value={checked} onChange={(next) => setChecked(next)} />
    </div>
  );
}
