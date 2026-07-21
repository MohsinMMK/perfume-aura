"use client";

import { useState } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@perfume-aura/ui/components/dialog";
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
    <div className="flex flex-wrap gap-1.5">
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogTrigger
          render={
            <Button type="button" size="xs" variant="outline" />
          }
        >
          Receive
        </DialogTrigger>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Receive stock</DialogTitle>
            <DialogDescription>{label}</DialogDescription>
          </DialogHeader>
          <ReceiveStockForm
            variants={options}
            defaultVariantId={variantId}
            compact
            title="Receive"
            description="Units received into MAIN."
          />
        </DialogContent>
      </Dialog>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogTrigger
          render={<Button type="button" size="xs" variant="ghost" />}
        >
          Adjust
        </DialogTrigger>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
            <DialogDescription>{label}</DialogDescription>
          </DialogHeader>
          <AdjustStockForm
            variants={options}
            defaultVariantId={variantId}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
