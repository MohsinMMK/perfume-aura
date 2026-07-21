"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import { archiveCustomerAction } from "@/lib/customers";

export function ArchiveCustomerButton({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (!confirm("Archive this customer?")) return;
    setPending(true);
    const result = await archiveCustomerAction({ customerId });
    setPending(false);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    router.push("/customers");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={onClick}
    >
      Archive
    </Button>
  );
}
