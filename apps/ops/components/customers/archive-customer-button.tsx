"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Button } from "@perfume-aura/ui/components/button";
import { FieldError } from "@perfume-aura/ui/components/field";
import { Spinner } from "@perfume-aura/ui/components/spinner";
import { toast } from "@perfume-aura/ui/components/sonner";
import { archiveCustomerAction } from "@/lib/customers";

export function ArchiveCustomerButton({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onArchive() {
    setPending(true);
    setError(null);
    let result: Awaited<ReturnType<typeof archiveCustomerAction>>;
    try {
      result = await archiveCustomerAction({ customerId });
    } catch {
      const message = "The customer could not be archived";
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
    toast.success("Customer archived");
    setOpen(false);
    setPending(false);
    router.push("/customers");
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
        render={<Button type="button" variant="outline" />}
      >
        Archive
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive customer?</AlertDialogTitle>
          <AlertDialogDescription>
            The customer will be hidden from new invoice selectors. Existing
            invoices and payment history remain available.
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
            onClick={onArchive}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Archiving…" : "Archive customer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
