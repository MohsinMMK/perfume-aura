"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { useToast } from "@astryxdesign/core/Toast";
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
  variant: "primary" | "secondary" | "destructive";
  run: () => ActionResponse;
};

function InvoiceActionDialog({ action }: { action: InvoiceActionConfig }) {
  const router = useRouter();
  const showToast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function execute() {
    if (pending) return;
    setPending(true);
    let result: Awaited<ReturnType<typeof action.run>>;
    try {
      result = await action.run();
    } catch {
      showToast({
        body: "The invoice action could not be completed",
        type: "error",
      });
      setPending(false);
      return;
    }
    if (!result.ok) {
      showToast({ body: result.error ?? "Action failed", type: "error" });
      setPending(false);
      return;
    }
    showToast({ body: `${action.label} completed` });
    setOpen(false);
    setPending(false);
    router.refresh();
  }

  return (
    <>
      <Button
        label={action.label}
        variant={action.variant}
        onClick={() => setOpen(true)}
      />
      <AlertDialog
        isOpen={open}
        onOpenChange={(nextOpen) => {
          if (pending) return;
          setOpen(nextOpen);
        }}
        title={action.title}
        description={action.description}
        actionLabel={pending ? action.pendingLabel : action.label}
        actionVariant={action.variant}
        isActionLoading={pending}
        onAction={execute}
      />
    </>
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
    variant: "primary",
    run: () => issueInvoiceAction({ invoiceId }),
  };
  const markPaid: InvoiceActionConfig = {
    label: "Mark paid",
    pendingLabel: "Recording…",
    title: "Record full cash payment?",
    description:
      "This records the full remaining balance as a cash payment. It does not move stock.",
    variant: "primary",
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
    <HStack gap={2} wrap="wrap">
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
      <Button
        label="Print / PDF"
        href={`/invoices/${invoiceId}/print`}
        target="_blank"
        variant="secondary"
      />
    </HStack>
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
  const showToast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function removeLine() {
    if (pending) return;
    setPending(true);
    let result: Awaited<ReturnType<typeof removeInvoiceLineAction>>;
    try {
      result = await removeInvoiceLineAction({ invoiceId, lineId });
    } catch {
      showToast({
        body: "The invoice line could not be removed",
        type: "error",
      });
      setPending(false);
      return;
    }
    if (!result.ok) {
      showToast({ body: result.error, type: "error" });
      setPending(false);
      return;
    }
    showToast({ body: "Invoice line removed" });
    setOpen(false);
    setPending(false);
    router.refresh();
  }

  return (
    <>
      <Button
        label="Remove"
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
      />
      <AlertDialog
        isOpen={open}
        onOpenChange={(nextOpen) => {
          if (pending) return;
          setOpen(nextOpen);
        }}
        title="Remove invoice line?"
        description="The draft total will be recalculated. This cannot be undone after the line is removed."
        actionLabel={pending ? "Removing…" : "Remove line"}
        actionVariant="destructive"
        isActionLoading={pending}
        onAction={removeLine}
      />
    </>
  );
}
