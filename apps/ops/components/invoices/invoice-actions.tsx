"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@perfume-aura/ui/components/alert-dialog";
import {
  Button,
  buttonVariants,
} from "@perfume-aura/ui/components/button";
import { FieldError } from "@perfume-aura/ui/components/field";
import { Spinner } from "@perfume-aura/ui/components/spinner";
import { toast } from "@perfume-aura/ui/components/sonner";
import {
  fulfillInvoiceAction,
  issueInvoiceAction,
  markInvoicePaidAction,
  removeInvoiceLineAction,
  voidInvoiceAction,
} from "@/lib/invoices";

type ActionResponse = Promise<{ ok: boolean; error?: string }>;

type InvoiceActionConfig = {
  label: string;
  pendingLabel: string;
  title: string;
  description: string;
  variant: "default" | "secondary" | "outline" | "destructive";
  run: () => ActionResponse;
};

function InvoiceActionDialog({ action }: { action: InvoiceActionConfig }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function execute() {
    setPending(true);
    setError(null);
    let result: Awaited<ReturnType<typeof action.run>>;
    try {
      result = await action.run();
    } catch {
      const message = "The invoice action could not be completed";
      setError(message);
      toast.error(message);
      setPending(false);
      return;
    }
    if (!result.ok) {
      const message = result.error ?? "Action failed";
      setError(message);
      toast.error(message);
      setPending(false);
      return;
    }
    toast.success(`${action.label} completed`);
    setOpen(false);
    setPending(false);
    router.refresh();
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (pending) return;
        setOpen(nextOpen);
        if (!nextOpen) setError(null);
      }}
    >
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant={action.variant}
            disabled={pending}
            focusableWhenDisabled={pending}
          />
        }
      >
        {action.label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{action.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {action.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <FieldError>{error}</FieldError> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant={action.variant}
            disabled={pending}
            focusableWhenDisabled={pending}
            onClick={execute}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? action.pendingLabel : action.label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function InvoiceStatusActions({
  canFulfill,
  canIssue,
  canRecordPayment,
  canVoid,
  invoiceId,
  status,
}: {
  canFulfill: boolean;
  canIssue: boolean;
  canRecordPayment: boolean;
  canVoid: boolean;
  invoiceId: string;
  status: string;
}) {
  const markPaidRequest = useRef<{
    idempotencyKey: string;
    paidAt: string;
  } | null>(null);

  const issue: InvoiceActionConfig = {
    label: "Issue",
    pendingLabel: "Issuing…",
    title: "Issue invoice?",
    description:
      "Issuing assigns the invoice number and locks its current lines.",
    variant: "default",
    run: () => issueInvoiceAction({ invoiceId }),
  };
  const markPaid: InvoiceActionConfig = {
    label: "Mark paid",
    pendingLabel: "Recording…",
    title: "Record full cash payment?",
    description:
      "This records the full remaining balance as a cash payment. It does not move stock.",
    variant: "default",
    run: () => {
      markPaidRequest.current ??= {
        idempotencyKey: crypto.randomUUID(),
        paidAt: new Date().toISOString(),
      };
      return markInvoicePaidAction({
        invoiceId,
        ...markPaidRequest.current,
      });
    },
  };
  const fulfill: InvoiceActionConfig = {
    label: "Fulfill stock",
    pendingLabel: "Fulfilling…",
    title: "Fulfill remaining SKU lines?",
    description:
      "This decrements inventory for each remaining SKU quantity. The ledger records the cost snapshot.",
    variant: "secondary",
    run: () => fulfillInvoiceAction({ invoiceId }),
  };
  const voidAction: InvoiceActionConfig = {
    label: "Void",
    pendingLabel: "Voiding…",
    title: "Void invoice?",
    description:
      "The invoice will remain in history, but no further payments or fulfillment can be recorded.",
    variant: "destructive",
    run: () => voidInvoiceAction({ invoiceId }),
  };

  return (
    <div className="flex flex-wrap gap-2">
      {status === "draft" && canIssue ? (
        <InvoiceActionDialog action={issue} />
      ) : null}
      {status === "issued" ? (
        <>
          {canRecordPayment ? <InvoiceActionDialog action={markPaid} /> : null}
          {canFulfill ? <InvoiceActionDialog action={fulfill} /> : null}
          {canVoid ? <InvoiceActionDialog action={voidAction} /> : null}
        </>
      ) : null}
      {status === "paid" && canFulfill ? (
        <InvoiceActionDialog action={fulfill} />
      ) : null}
      <Link
        href={`/invoices/${invoiceId}/print`}
        target="_blank"
        className={buttonVariants({ variant: "outline" })}
      >
        Print / PDF
      </Link>
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
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function removeLine() {
    setPending(true);
    setError(null);
    let result: Awaited<ReturnType<typeof removeInvoiceLineAction>>;
    try {
      result = await removeInvoiceLineAction({ invoiceId, lineId });
    } catch {
      const message = "The invoice line could not be removed";
      setError(message);
      toast.error(message);
      setPending(false);
      return;
    }
    if (!result.ok) {
      setError(result.error);
      toast.error(result.error);
      setPending(false);
      return;
    }
    toast.success("Invoice line removed");
    setOpen(false);
    setPending(false);
    router.refresh();
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (pending) return;
        setOpen(nextOpen);
        if (!nextOpen) setError(null);
      }}
    >
      <AlertDialogTrigger
        render={<Button type="button" size="sm" variant="ghost" />}
      >
        Remove
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove invoice line?</AlertDialogTitle>
          <AlertDialogDescription>
            The draft total will be recalculated. This cannot be undone after
            the line is removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <FieldError>{error}</FieldError> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            disabled={pending}
            focusableWhenDisabled={pending}
            onClick={removeLine}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Removing…" : "Remove line"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
