"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Button } from "@astryxdesign/core/Button";
import { useToast } from "@astryxdesign/core/Toast";
import { archiveCustomerAction } from "@/lib/customers";

export function ArchiveCustomerButton({ customerId }: { customerId: string }) {
  const router = useRouter();
  const showToast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function onArchive() {
    setPending(true);
    let result: Awaited<ReturnType<typeof archiveCustomerAction>>;
    try {
      result = await archiveCustomerAction({ customerId });
    } catch {
      showToast({
        body: "The customer could not be archived",
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
    showToast({ body: "Customer archived" });
    setOpen(false);
    setPending(false);
    router.push("/customers");
    router.refresh();
  }

  return (
    <>
      <Button
        label="Archive"
        variant="secondary"
        onClick={() => setOpen(true)}
      />
      <AlertDialog
        isOpen={open}
        onOpenChange={(nextOpen) => {
          if (pending) return;
          setOpen(nextOpen);
        }}
        title="Archive customer?"
        description="The customer will be hidden from new invoice selectors. Existing invoices and payment history remain available."
        cancelLabel="Cancel"
        actionLabel={pending ? "Archiving…" : "Archive customer"}
        actionVariant="destructive"
        isActionLoading={pending}
        onAction={onArchive}
      />
    </>
  );
}
