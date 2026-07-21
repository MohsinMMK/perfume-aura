"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@perfume-aura/ui/components/button";
import { cn } from "@perfume-aura/ui/lib/utils";
import {
  fulfillInvoiceAction,
  issueInvoiceAction,
  markInvoicePaidAction,
  removeInvoiceLineAction,
  voidInvoiceAction,
} from "@/lib/invoices";

export function InvoiceStatusActions({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(
    fn: () => Promise<{ ok: boolean; error?: string }>,
    confirmMsg?: string,
  ) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setPending(true);
    setError(null);
    const result = await fn();
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "draft" ? (
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              run(
                () => issueInvoiceAction({ invoiceId }),
                "Issue this invoice? Lines will be locked.",
              )
            }
          >
            Issue
          </Button>
        ) : null}
        {status === "issued" ? (
          <>
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => markInvoicePaidAction({ invoiceId }),
                  "Mark fully paid (manual Phase 2)?",
                )
              }
            >
              Mark paid
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() =>
                run(
                  () => fulfillInvoiceAction({ invoiceId }),
                  "Fulfill remaining SKU lines (decrements stock)?",
                )
              }
            >
              Fulfill stock
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(
                  () => voidInvoiceAction({ invoiceId }),
                  "Void this issued invoice?",
                )
              }
            >
              Void
            </Button>
          </>
        ) : null}
        {status === "paid" ? (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              run(
                () => fulfillInvoiceAction({ invoiceId }),
                "Fulfill remaining SKU lines (decrements stock)?",
              )
            }
          >
            Fulfill stock
          </Button>
        ) : null}
        <Link
          href={`/invoices/${invoiceId}/print`}
          className={cn(buttonVariants({ variant: "outline" }))}
          target="_blank"
        >
          Print / PDF
        </Link>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function RemoveLineButton({
  invoiceId,
  lineId,
}: {
  invoiceId: string;
  lineId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    const result = await removeInvoiceLineAction({ invoiceId, lineId });
    setPending(false);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={onClick}
    >
      Remove
    </Button>
  );
}
