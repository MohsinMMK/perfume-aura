"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@perfume-aura/ui/components/card";
import { Input } from "@perfume-aura/ui/components/input";
import { Label } from "@perfume-aura/ui/components/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@perfume-aura/ui/components/native-select";
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
        <CardHeader>
          <CardTitle>India checkout policy gates</CardTitle>
          <CardDescription>
            Amounts are entered in INR and stored as integer paise. Provider credentials and
            legal approval are separate release gates.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="flatShippingAmount">Flat delivery fee (INR)</Label>
            <Input
              id="flatShippingAmount"
              name="flatShippingAmount"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={rupees(settings?.flatShippingAmountMinor)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="freeShippingThreshold">Free-shipping threshold (INR)</Label>
            <Input
              id="freeShippingThreshold"
              name="freeShippingThreshold"
              type="number"
              min="0"
              step="0.01"
              defaultValue={rupees(settings?.freeShippingThresholdMinor)}
              placeholder="Optional"
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="taxTreatment">Approved tax treatment</Label>
            <NativeSelect
              id="taxTreatment"
              name="taxTreatment"
              required
              defaultValue={settings?.taxTreatment ?? ""}
            >
              <NativeSelectOption value="" disabled>Select only after owner/legal approval</NativeSelectOption>
              <NativeSelectOption value="prices_include_approved_tax">Approved tax is included in listed prices</NativeSelectOption>
              <NativeSelectOption value="no_tax_collected_owner_approved">No tax collected (owner/legal approved)</NativeSelectOption>
            </NativeSelect>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="taxApprovalReference">Tax approval reference</Label>
            <Input id="taxApprovalReference" name="taxApprovalReference" defaultValue={settings?.taxApprovalReference ?? ""} placeholder="Approved decision or adviser reference" />
          </div>
          <label className="flex min-h-11 items-center gap-3 rounded-md border px-3 text-sm sm:col-span-2">
            <input name="taxPolicyApproved" type="checkbox" defaultChecked={settings?.taxPolicyApproved ?? false} className="size-4" />
            Tax treatment and evidence reference approved
          </label>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="supportChannel">Approved customer support channel</Label>
            <Input
              id="supportChannel"
              name="supportChannel"
              required
              defaultValue={settings?.supportChannel ?? ""}
              placeholder="Email or phone approved for public policy pages"
            />
          </div>
          <label className="flex min-h-11 items-center gap-3 rounded-md border px-3 text-sm sm:col-span-2">
            <input name="supportOperationsApproved" type="checkbox" defaultChecked={settings?.supportOperationsApproved ?? false} className="size-4" />
            Support channel, staffing, and response operations approved
          </label>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="legalApprovalReference">Catalog legal approval reference</Label>
            <Input id="legalApprovalReference" name="legalApprovalReference" defaultValue={settings?.legalApprovalReference ?? ""} placeholder="India-counsel evidence reference" />
          </div>
          <label className="flex min-h-11 items-center gap-3 rounded-md border px-3 text-sm sm:col-span-2">
            <input name="catalogLegalApproved" type="checkbox" defaultChecked={settings?.catalogLegalApproved ?? false} className="size-4" />
            Catalog naming, surfaces, and disclaimer treatment approved
          </label>
          <fieldset className="grid gap-3 sm:col-span-2">
            <legend className="text-sm font-medium">Policy approvals</legend>
            {[
              ["shippingPolicyApproved", "Shipping policy approved", settings?.shippingPolicyApproved],
              ["returnsPolicyApproved", "Returns policy approved", settings?.returnsPolicyApproved],
              ["cancellationPolicyApproved", "Cancellation policy approved", settings?.cancellationPolicyApproved],
            ].map(([name, label, checked]) => (
              <label key={String(name)} className="flex min-h-11 items-center gap-3 rounded-md border px-3 text-sm">
                <input name={String(name)} type="checkbox" defaultChecked={Boolean(checked)} className="size-4" />
                {String(label)}
              </label>
            ))}
          </fieldset>
          <label className="flex min-h-11 items-center gap-3 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 text-sm sm:col-span-2">
            <input
              name="checkoutEnabled"
              type="checkbox"
              defaultChecked={settings?.checkoutEnabled ?? false}
              className="size-4"
            />
            Enable checkout after all policy approvals are confirmed
          </label>
          {error ? <p className="text-sm text-destructive sm:col-span-2" role="alert">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-700 sm:col-span-2" role="status">{message}</p> : null}
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={pending} focusableWhenDisabled={pending}>
            {pending ? "Saving…" : "Save checkout gates"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
