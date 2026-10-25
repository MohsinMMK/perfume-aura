"use client";

import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack } from "@astryxdesign/core/HStack";
import { VStack } from "@astryxdesign/core/VStack";
import { ReceiveStockForm } from "@/components/stock/receive-stock-form";
import { AdjustStockForm } from "@/components/stock/adjust-stock-form";

type Props = {
  variantId: string;
  label: string;
};

export function VariantStockDialogs({ variantId, label }: Props) {
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const options = [{ id: variantId, label }];

  return (
    <HStack gap={1.5} wrap="wrap">
      <Button
        label="Receive"
        size="sm"
        variant="secondary"
        onClick={() => setReceiveOpen(true)}
      />
      <Dialog
        isOpen={receiveOpen}
        onOpenChange={setReceiveOpen}
        purpose="form"
        width={448}
      >
        <VStack gap={4}>
          <DialogHeader
            title="Receive stock"
            subtitle={label}
            onOpenChange={setReceiveOpen}
          />
          <ReceiveStockForm
            variants={options}
            defaultVariantId={variantId}
            compact
            title="Receive"
            description="Units received into MAIN."
          />
        </VStack>
      </Dialog>

      <Button
        label="Adjust"
        size="sm"
        variant="ghost"
        onClick={() => setAdjustOpen(true)}
      />
      <Dialog
        isOpen={adjustOpen}
        onOpenChange={setAdjustOpen}
        purpose="form"
        width={448}
      >
        <VStack gap={4}>
          <DialogHeader
            title="Adjust stock"
            subtitle={label}
            onOpenChange={setAdjustOpen}
          />
          <AdjustStockForm variants={options} defaultVariantId={variantId} />
        </VStack>
      </Dialog>
    </HStack>
  );
}
