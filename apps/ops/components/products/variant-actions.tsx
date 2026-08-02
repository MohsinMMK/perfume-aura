"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@perfume-aura/ui/components/dialog";
import { FieldError, FieldGroup } from "@perfume-aura/ui/components/field";
import { Spinner } from "@perfume-aura/ui/components/spinner";
import { FormField } from "@/components/form-field";
import {
  archiveVariantAction,
  reactivateVariantAction,
  updateVariantAction,
  type VariantRow,
} from "@/lib/products";
import { VariantStockDialogs } from "@/components/stock/variant-stock-dialogs";

type Props = {
  productId: string;
  productName: string;
  productStatus: "active" | "archived";
  variant: VariantRow;
};

export function VariantActions({
  productId,
  productName,
  productStatus,
  variant,
}: Props) {
  const router = useRouter();
  const [version, setVersion] = useState(variant.version);
  const [editOpen, setEditOpen] = useState(false);
  const [lifecycleOpen, setLifecycleOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const archiving = variant.status === "active";

  async function onEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    let result: Awaited<ReturnType<typeof updateVariantAction>>;
    try {
      result = await updateVariantAction({
        productId,
        variantId: variant.id,
        expectedVersion: version,
        sku: String(form.get("sku") ?? "").trim(),
        barcode: String(form.get("barcode") ?? "").trim(),
        sizeMl: Number(form.get("sizeMl")),
        cost: Number(form.get("cost")),
        retail: Number(form.get("retail")),
        reorderLevel: Number(form.get("reorderLevel")),
      });
    } catch {
      const message = "The variant update could not be completed";
      setError(message);
      toast.error(message);
      setPending(false);
      return;
    }

    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      toast.error(result.error);
      setPending(false);
      return;
    }

    if (result.data?.version !== undefined) setVersion(result.data.version);
    toast.success("Variant updated");
    setEditOpen(false);
    setPending(false);
    router.refresh();
  }

  async function changeLifecycle() {
    setPending(true);
    setError(null);
    const action = archiving ? archiveVariantAction : reactivateVariantAction;
    let result: Awaited<ReturnType<typeof action>>;
    try {
      result = await action({
        productId,
        variantId: variant.id,
        expectedVersion: version,
      });
    } catch {
      const message = "The variant action could not be completed";
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

    if (result.data?.version !== undefined) setVersion(result.data.version);
    toast.success(archiving ? "Variant archived" : "Variant reactivated");
    setLifecycleOpen(false);
    setPending(false);
    router.refresh();
  }

  const fieldError = (name: string) => fieldErrors[name]?.[0];
  const label = `${productName} — ${variant.sku} (${variant.sizeMl} ml)`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {variant.status === "active" && productStatus === "active" ? (
        <VariantStockDialogs variantId={variant.id} label={label} />
      ) : null}

      <Dialog
        open={editOpen}
        onOpenChange={(nextOpen) => {
          if (pending) return;
          setEditOpen(nextOpen);
          if (!nextOpen) {
            setError(null);
            setFieldErrors({});
          }
        }}
      >
        <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
          Edit
        </DialogTrigger>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit variant</DialogTitle>
            <DialogDescription>
              Update catalog fields for {variant.sku}. Stock balances are not
              changed here.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onEdit} className="flex flex-col gap-6">
            <FieldGroup className="gap-4 sm:grid sm:grid-cols-2 sm:gap-4">
              <FormField
                label="SKU"
                name="sku"
                required
                defaultValue={variant.sku}
                error={fieldError("sku")}
              />
              <FormField
                label="Barcode"
                name="barcode"
                defaultValue={variant.barcode ?? ""}
                error={fieldError("barcode")}
              />
              <FormField
                label="Size (ml)"
                name="sizeMl"
                type="number"
                min={1}
                step={1}
                required
                defaultValue={variant.sizeMl}
                error={fieldError("sizeMl")}
              />
              <FormField
                label="Reorder level"
                name="reorderLevel"
                type="number"
                min={0}
                step={1}
                required
                defaultValue={variant.reorderLevel}
                error={fieldError("reorderLevel")}
              />
              <FormField
                label="Cost (INR)"
                name="cost"
                type="number"
                min={0}
                step="0.01"
                required
                defaultValue={variant.costCents / 100}
                error={fieldError("cost")}
              />
              <FormField
                label="Retail (INR)"
                name="retail"
                type="number"
                min={0}
                step="0.01"
                required
                defaultValue={variant.retailCents / 100}
                error={fieldError("retail")}
              />
              {error ? (
                <FieldError className="sm:col-span-2">{error}</FieldError>
              ) : null}
            </FieldGroup>
            <DialogFooter>
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    focusableWhenDisabled={pending}
                  />
                }
              >
                Cancel
              </DialogClose>
              <Button
                type="submit"
                disabled={pending}
                focusableWhenDisabled={pending}
              >
                {pending ? <Spinner data-icon="inline-start" /> : null}
                {pending ? "Saving…" : "Save variant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={lifecycleOpen}
        onOpenChange={(nextOpen) => {
          if (pending) return;
          setLifecycleOpen(nextOpen);
          if (!nextOpen) setError(null);
        }}
      >
        <AlertDialogTrigger
          render={
            <Button
              type="button"
              variant={archiving ? "destructive" : "outline"}
              size="sm"
              disabled={!archiving && productStatus !== "active"}
            />
          }
        >
          {archiving ? "Archive" : "Reactivate"}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {archiving ? "Archive variant?" : "Reactivate variant?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {archiving
                ? `Archive ${variant.sku}? Its stock balance and movement history remain available.`
                : productStatus === "active"
                  ? `Make ${variant.sku} available in stock and invoice selectors again?`
                  : "Reactivate the product before reactivating this variant."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <FieldError>{error}</FieldError> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant={archiving ? "destructive" : "default"}
              disabled={pending || (!archiving && productStatus !== "active")}
              focusableWhenDisabled={pending}
              onClick={changeLifecycle}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {pending
                ? archiving
                  ? "Archiving…"
                  : "Reactivating…"
                : archiving
                  ? "Archive variant"
                  : "Reactivate variant"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
