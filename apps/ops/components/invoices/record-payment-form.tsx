"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@perfume-aura/ui/components/card";
import {
  NativeSelect,
  NativeSelectOption,
} from "@perfume-aura/ui/components/native-select";
import { Spinner } from "@perfume-aura/ui/components/spinner";
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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setOkMsg(null);
    const fd = new FormData(e.currentTarget);
    const result = await recordPaymentAction({
      invoiceId,
      amount: Number(fd.get("amount")),
      method: String(fd.get("method") ?? "cash") as
        | "cash"
        | "bank_transfer"
        | "card"
        | "other",
      paidAt: String(fd.get("paidAt") ?? "") || undefined,
      reference: String(fd.get("reference") ?? "").trim() || undefined,
      note: String(fd.get("note") ?? "").trim() || undefined,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOkMsg(
      result.data?.fullyPaid
        ? "Payment recorded — invoice fully paid."
        : "Partial payment recorded.",
    );
    router.refresh();
  }

  const defaultAmount =
    balanceRupees > 0 ? String(Number(balanceRupees.toFixed(2))) : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Record payment</CardTitle>
        <CardDescription>
          Manual cash / bank / card. Does not change stock. Balance:{" "}
          <span className="font-medium text-foreground">
            Rs {balanceRupees.toFixed(2)}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Amount (Rs)"
              name="amount"
              type="number"
              step="0.01"
              min={0.01}
              required
              defaultValue={defaultAmount}
            />
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="method">
                Method
              </label>
              <NativeSelect
                id="method"
                name="method"
                defaultValue="cash"
                className="w-full"
              >
                <NativeSelectOption value="cash">Cash</NativeSelectOption>
                <NativeSelectOption value="bank_transfer">
                  Bank transfer
                </NativeSelectOption>
                <NativeSelectOption value="card">Card</NativeSelectOption>
                <NativeSelectOption value="other">Other</NativeSelectOption>
              </NativeSelect>
            </div>
            <FormField
              label="Paid at"
              name="paidAt"
              type="datetime-local"
            />
            <FormField
              label="Reference"
              name="reference"
              placeholder="Bank ref / cheque #"
            />
          </div>
          <TextAreaField label="Note" name="note" rows={2} />
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {okMsg ? (
            <p className="text-sm text-muted-foreground" role="status">
              {okMsg}
            </p>
          ) : null}
          <Button type="submit" disabled={pending || balanceRupees <= 0}>
            {pending ? <Spinner /> : null}
            Record payment
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
