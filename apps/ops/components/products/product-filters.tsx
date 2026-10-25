"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import { cn } from "@/lib/cn";

type Props = {
  q: string;
  status: "active" | "archived" | "all";
  className?: string;
  searchPlaceholder?: string;
  searchLabel?: string;
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

/**
 * GET filters for products list (shareable URL, server-rendered results).
 */
export function ProductFilters({
  q,
  status,
  className,
  searchPlaceholder = "Search name, brand, category, SKU…",
  searchLabel = "Search products",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(q);
  const [statusValue, setStatusValue] = useState<string>(status);

  function update(next: { q?: string; status?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextQ = next.q !== undefined ? next.q : q;
    const nextStatus = next.status !== undefined ? next.status : status;

    if (nextQ.trim()) params.set("q", nextQ.trim());
    else params.delete("q");

    if (nextStatus && nextStatus !== "active") params.set("status", nextStatus);
    else params.delete("status");
    params.delete("page");

    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <HStack
      as="form"
      gap={2}
      align="end"
      wrap="wrap"
      className={cn(pending && "opacity-70", className)}
      onSubmit={(e) => {
        e.preventDefault();
        update({ q: search, status: statusValue });
      }}
    >
      <TextInput
        label={searchLabel}
        htmlName="q"
        value={search}
        onChange={setSearch}
        placeholder={searchPlaceholder}
        hasClear
        containerClassName="w-full sm:w-80"
      />
      <Selector
        label="Status"
        htmlName="status"
        options={STATUS_OPTIONS}
        value={statusValue}
        onChange={(next) => {
          setStatusValue(next);
          update({ q: search, status: next });
        }}
        containerClassName="w-full sm:w-40"
      />
      {/* Enter in the search box submits; keyboard users see the button when it takes focus. */}
      <Button
        type="submit"
        label="Apply filters"
        className="not-focus-visible:sr-only"
      />
    </HStack>
  );
}
