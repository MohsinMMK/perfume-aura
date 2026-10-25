"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Button } from "@astryxdesign/core/Button";
import { useToast } from "@astryxdesign/core/Toast";
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
  const showToast = useToast();
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
      showToast({ body: message, type: "error" });
      setPending(false);
      return;
    }

    if (!result.ok) {
      setError(result.error);
      showToast({ body: result.error, type: "error" });
      setPending(false);
      return;
    }

    showToast({
      body: archiving ? "Product archived" : "Product reactivated",
    });
    setOpen(false);
    setPending(false);
    router.refresh();
  }

  const description = archiving
    ? `Archive “${productName}” and all of its variants? Stock balances and history are preserved.`
    : `Reactivate “${productName}”? Its variants stay archived until you review and reactivate each SKU.`;

  return (
    <>
      <Button
        type="button"
        label={archiving ? "Archive" : "Reactivate"}
        variant={archiving ? "destructive" : "secondary"}
        size="sm"
        onClick={() => setOpen(true)}
      />
      <AlertDialog
        isOpen={open}
        onOpenChange={(nextOpen) => {
          if (pending) return;
          setOpen(nextOpen);
          if (!nextOpen) setError(null);
        }}
        title={archiving ? "Archive product?" : "Reactivate product?"}
        description={error ? `${description} ${error}` : description}
        actionLabel={archiving ? "Archive product" : "Reactivate product"}
        actionVariant={archiving ? "destructive" : "primary"}
        isActionLoading={pending}
        onAction={changeStatus}
      />
    </>
  );
}
