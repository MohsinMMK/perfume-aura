"use server";

import {
  getFinanceSnapshot,
  type FinanceSnapshot,
} from "@perfume-aura/db";
import { requireCapability } from "@/lib/session";

export type FinanceSummary = FinanceSnapshot;

export async function getFinanceSummary(
  days = 30,
): Promise<FinanceSummary> {
  await requireCapability("finance.view");
  return getFinanceSnapshot(days);
}
