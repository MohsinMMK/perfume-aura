"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { deactivateStaffAction } from "@/lib/staff-operations";

export function DeactivateStaffButton({
  staffUserId,
}: {
  staffUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deactivate() {
    setError(null);
    setPending(true);
    try {
      const result = await deactivateStaffAction({ userId: staffUserId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Staff account deactivated and sessions revoked");
      setOpen(false);
      router.refresh();
    } catch {
      setError("The staff account could not be deactivated.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" type="button" />}>
        Deactivate
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate this staff account?</AlertDialogTitle>
          <AlertDialogDescription>
            This bans the account and revokes every active session. It does not
            delete the identity or its audit history.
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
            onClick={deactivate}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Deactivating…" : "Deactivate and revoke sessions"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
