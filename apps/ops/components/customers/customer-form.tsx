"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack } from "@astryxdesign/core/HStack";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
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
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={mode === "create" ? 1 : 2}>
              {mode === "create" ? "New customer" : "Edit customer"}
            </Heading>
            <Text color="secondary">B2B or walk-in contact for invoices.</Text>
          </VStack>
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
          {error ? <Banner status="error" title={error} /> : null}
          <HStack gap={2}>
            <Button
              type="submit"
              variant="primary"
              label={mode === "create" ? "Create" : "Save"}
              isLoading={pending}
            />
          </HStack>
        </VStack>
      </Card>
    </form>
  );
}
