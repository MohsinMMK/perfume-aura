"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@perfume-aura/ui/components/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@perfume-aura/ui/components/native-select";
import { cn } from "@perfume-aura/ui/lib/utils";

type Props = {
  q: string;
  status: "active" | "archived" | "all";
  className?: string;
};

/**
 * GET filters for products list (shareable URL, server-rendered results).
 */
export function ProductFilters({ q, status, className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(next: { q?: string; status?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextQ = next.q !== undefined ? next.q : q;
    const nextStatus = next.status !== undefined ? next.status : status;

    if (nextQ.trim()) params.set("q", nextQ.trim());
    else params.delete("q");

    if (nextStatus && nextStatus !== "active") params.set("status", nextStatus);
    else params.delete("status");

    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <form
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center",
        pending && "opacity-70",
        className,
      )}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        update({
          q: String(fd.get("q") ?? ""),
          status: String(fd.get("status") ?? "active"),
        });
      }}
    >
      <Input
        name="q"
        defaultValue={q}
        placeholder="Search name, brand, category, SKU…"
        className="sm:max-w-xs"
        aria-label="Search products"
      />
      <NativeSelect
        name="status"
        defaultValue={status}
        className="w-full sm:w-40"
        aria-label="Status filter"
        onChange={(e) => {
          const form = e.currentTarget.form;
          if (!form) return;
          const fd = new FormData(form);
          update({
            q: String(fd.get("q") ?? ""),
            status: e.currentTarget.value,
          });
        }}
      >
        <NativeSelectOption value="active">Active</NativeSelectOption>
        <NativeSelectOption value="archived">Archived</NativeSelectOption>
        <NativeSelectOption value="all">All</NativeSelectOption>
      </NativeSelect>
      <button type="submit" className="sr-only">
        Apply
      </button>
    </form>
  );
}
