import type { SupplyKind } from "@/lib/production";

export type SupplyOption = {
  id: string;
  kind: SupplyKind;
  name: string;
  sizeMl: number | null;
};

export const supplyKindLabel: Record<SupplyKind, string> = {
  bottle: "Bottle",
  box: "Box",
  base: "Base mixture",
};

/** Bottles and boxes count in pieces; the base mixture in ml. */
export function supplyUnit(kind: SupplyKind): string {
  return kind === "base" ? "ml" : "pcs";
}

export function supplyOptionLabel(supply: SupplyOption): string {
  const size = supply.sizeMl ? ` · ${supply.sizeMl} ml` : "";
  return `${supply.name} · ${supplyKindLabel[supply.kind]}${size}`;
}
