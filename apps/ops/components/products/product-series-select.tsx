"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { useToast } from "@astryxdesign/core/Toast";
import { assignProductSeriesAction } from "@/lib/production";

const NONE = "none";

/** Moves a product into a series, or out of every series. */
export function ProductSeriesSelect({
  productId,
  seriesId,
  options,
}: {
  productId: string;
  seriesId: string | null;
  options: { id: string; name: string }[];
}) {
  const router = useRouter();
  const showToast = useToast();
  const [value, setValue] = useState(seriesId ?? NONE);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isChanged = value !== (seriesId ?? NONE);

  async function save() {
    setPending(true);
    setError(null);
    try {
      const result = await assignProductSeriesAction({
        productId,
        seriesId: value === NONE ? "" : value,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      showToast({ body: value === NONE ? "Removed from series" : "Series saved" });
      router.refresh();
    } catch {
      setError("The series could not be saved");
    } finally {
      setPending(false);
    }
  }

  return (
    <HStack gap={2} align="end" wrap="wrap">
      <Selector
        label="Series"
        width={240}
        value={value}
        onChange={(next) => setValue(String(next))}
        options={[
          { value: NONE, label: "No series" },
          ...options.map((option) => ({ value: option.id, label: option.name })),
        ]}
        controlClassName="min-h-11"
        status={error ? { type: "error", message: error } : undefined}
      />
      <Button
        type="button"
        label="Save series"
        variant="secondary"
        isLoading={pending}
        isDisabled={!isChanged}
        onClick={save}
      />
    </HStack>
  );
}
