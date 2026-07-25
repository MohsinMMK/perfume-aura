"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "@perfume-aura/ui/components/sonner";
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
import { FormField, TextAreaField } from "@/components/form-field";
import { updateProductAction } from "@/lib/products";

type Props = {
  product: {
    id: string;
    name: string;
    brand: string | null;
    category: string | null;
    description: string | null;
    updatedAt: string;
  };
};

export function ProductEditDialog({ product }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(product.updatedAt);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    let result: Awaited<ReturnType<typeof updateProductAction>>;
    try {
      result = await updateProductAction({
        productId: product.id,
        expectedUpdatedAt,
        name: String(form.get("name") ?? "").trim(),
        brand: String(form.get("brand") ?? "").trim(),
        category: String(form.get("category") ?? "").trim(),
        description: String(form.get("description") ?? "").trim(),
      });
    } catch {
      const message = "The product update could not be completed";
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

    if (result.data?.updatedAt) setExpectedUpdatedAt(result.data.updatedAt);
    toast.success("Product updated");
    setOpen(false);
    setPending(false);
    router.refresh();
  }

  const fieldError = (name: string) => fieldErrors[name]?.[0];

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (pending) return;
        setOpen(nextOpen);
        if (!nextOpen) {
          setError(null);
          setFieldErrors({});
        }
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        Edit details
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit product</DialogTitle>
          <DialogDescription>
            Update catalog details. Lifecycle and inventory are managed
            separately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <FieldGroup className="gap-4">
            <FormField
              label="Name"
              name="name"
              required
              defaultValue={product.name}
              error={fieldError("name")}
            />
            <FormField
              label="Brand"
              name="brand"
              defaultValue={product.brand ?? ""}
              error={fieldError("brand")}
            />
            <FormField
              label="Category"
              name="category"
              defaultValue={product.category ?? ""}
              error={fieldError("category")}
            />
            <TextAreaField
              label="Description"
              name="description"
              defaultValue={product.description ?? ""}
              error={fieldError("description")}
            />
            {error ? <FieldError>{error}</FieldError> : null}
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
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
