"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { deactivateStaffAction } from "@/lib/staff-operations";

export function DeactivateStaffButton({
  staffUserId,
}: {
  staffUserId: string;
}) {
  const router = useRouter();
  const showToast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deactivate() {
    setError(null);
    setPending(true);
    try {
      const result = await deactivateStaffAction({ userId: staffUserId });
      if (!result.ok) {
        setError(result.error);
        setOpen(false);
        return;
      }
      showToast({ body: "Staff account deactivated and sessions revoked" });
      setOpen(false);
      router.refresh();
    } catch {
      setError("The staff account could not be deactivated.");
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <VStack gap={1} align="end">
      <Button
        type="button"
        variant="secondary"
        label="Deactivate"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      />
      {error ? (
        <div role="alert">
          <Text as="p" type="supporting" className="text-error">
            {error}
          </Text>
        </div>
      ) : null}
      <AlertDialog
        isOpen={open}
        onOpenChange={(next) => {
          // Cancel and Escape wait until the request settles.
          if (!pending) setOpen(next);
        }}
        title="Deactivate this staff account?"
        description="This bans the account and revokes every active session. It does not delete the identity or its audit history."
        actionLabel={
          pending ? "Deactivating…" : "Deactivate and revoke sessions"
        }
        actionVariant="destructive"
        isActionLoading={pending}
        onAction={deactivate}
      />
    </VStack>
  );
}
