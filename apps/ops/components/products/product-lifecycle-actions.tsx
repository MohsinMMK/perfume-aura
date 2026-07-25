"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@perfume-aura/ui/components/sonner";
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
import {
  archiveProductAction,
  reactivateProductAction,
} from "@/lib/products";

type Props = {
  productId: string;
  productName: string;
  status: "active" | "archived";
  expectedUpdatedAt: string;
};

export function ProductLifecycleActions({
  productId,
  productName,
  status,
  expectedUpdatedAt,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const archiving = status === "active";

  async function changeStatus() {
    setPending(true);
    setError(null);
    const action = archiving
      ? archiveProductAction
      : reactivateProductAction;
    let result: Awaited<ReturnType<typeof action>>;
    try {
      result = await action({ productId, expectedUpdatedAt });
    } catch {
      const message = "The product action could not be completed";
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

    toast.success(
      archiving ? "Product archived" : "Product reactivated",
    );
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
            variant={archiving ? "destructive" : "outline"}
            size="sm"
          />
        }
      >
        {archiving ? "Archive" : "Reactivate"}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {archiving ? "Archive product?" : "Reactivate product?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {archiving
              ? `Archive “${productName}” and all of its variants? Stock balances and history are preserved.`
              : `Reactivate “${productName}”? Its variants stay archived until you review and reactivate each SKU.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <FieldError>{error}</FieldError> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant={archiving ? "destructive" : "default"}
            disabled={pending}
            focusableWhenDisabled={pending}
            onClick={changeStatus}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending
              ? archiving
                ? "Archiving…"
                : "Reactivating…"
              : archiving
                ? "Archive product"
                : "Reactivate product"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
