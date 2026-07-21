"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@perfume-aura/ui/components/card";
import { FieldGroup } from "@perfume-aura/ui/components/field";
import { Spinner } from "@perfume-aura/ui/components/spinner";
import {
  createCustomerAction,
  updateCustomerAction,
} from "@/lib/customers";
import { FormField, TextAreaField } from "@/components/form-field";

type Props = {
  mode: "create" | "edit";
  customerId?: string;
  defaults?: {
    name: string;
    email: string;
    phone: string;
    addressLine: string;
    city: string;
    notes: string;
  };
};

export function CustomerForm({ mode, customerId, defaults }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      addressLine: String(fd.get("addressLine") ?? "").trim(),
      city: String(fd.get("city") ?? "").trim(),
      notes: String(fd.get("notes") ?? "").trim(),
    };

    try {
      const result =
        mode === "create"
          ? await createCustomerAction(payload)
          : await updateCustomerAction({
              ...payload,
              customerId: customerId!,
            });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        setPending(false);
        return;
      }
      const id =
        mode === "create"
          ? (result as { ok: true; data?: { customerId: string } }).data
              ?.customerId
          : customerId;
      router.push(id ? `/customers/${id}` : "/customers");
      router.refresh();
    } catch {
      setError("Something went wrong");
      setPending(false);
    }
  }

  const fe = (k: string) => fieldErrors[k]?.[0];
  const d = defaults;

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "New customer" : "Edit customer"}
          </CardTitle>
          <CardDescription>
            B2B or walk-in contact for invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="gap-4 sm:grid sm:grid-cols-2">
            <FormField
              label="Name"
              name="name"
              required
              defaultValue={d?.name}
              error={fe("name")}
              className="sm:col-span-2"
            />
            <FormField
              label="Email"
              name="email"
              type="email"
              defaultValue={d?.email}
              error={fe("email")}
            />
            <FormField
              label="Phone"
              name="phone"
              defaultValue={d?.phone}
              error={fe("phone")}
            />
            <FormField
              label="Address"
              name="addressLine"
              defaultValue={d?.addressLine}
              error={fe("addressLine")}
              className="sm:col-span-2"
            />
            <FormField
              label="City"
              name="city"
              defaultValue={d?.city}
              error={fe("city")}
            />
            <TextAreaField
              label="Notes"
              name="notes"
              defaultValue={d?.notes}
              error={fe("notes")}
              className="sm:col-span-2"
            />
          </FieldGroup>
          {error ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            {mode === "create" ? "Create" : "Save"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
