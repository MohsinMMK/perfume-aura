"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import { archiveProductAction } from "@/lib/products";

type Props = {
  productId: string;
  productName: string;
};

export function ArchiveProductButton({ productId, productName }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onArchive() {
    if (
      !window.confirm(
        `Archive “${productName}”? Variants will be archived too. Stock history is kept.`,
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await archiveProductAction({ productId });
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    router.refresh();
    setPending(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={onArchive}
      >
        {pending ? "Archiving…" : "Archive"}
      </Button>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
