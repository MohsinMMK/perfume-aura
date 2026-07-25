import { sql } from "drizzle-orm";
import { businessYearAt, BUSINESS_TIMEZONE } from "./business-time";
import { DomainError } from "./domain-errors";
import {
  documentNumberCounters,
  type DocumentNumberKind,
} from "./schema";
import type { DbTransaction } from "./transactions";

const prefixes: Record<DocumentNumberKind, string> = {
  invoice: "INV",
  payment: "PAY",
};

/**
 * Allocate a collision-free number while holding the counter row until the
 * surrounding transaction commits. The fixed four-digit namespace deliberately
 * fails at 9999 instead of silently changing the document-number contract.
 */
export async function allocateDocumentNumberInTransaction(
  tx: DbTransaction,
  kind: DocumentNumberKind,
  effectiveAt: Date,
  timeZone = BUSINESS_TIMEZONE,
): Promise<string> {
  const year = businessYearAt(effectiveAt, timeZone);
  const [counter] = await tx
    .insert(documentNumberCounters)
    .values({ kind, year, lastValue: 1, updatedAt: effectiveAt })
    .onConflictDoUpdate({
      target: [documentNumberCounters.kind, documentNumberCounters.year],
      set: {
        lastValue: sql`${documentNumberCounters.lastValue} + 1`,
        updatedAt: effectiveAt,
      },
      setWhere: sql`${documentNumberCounters.lastValue} < 9999`,
    })
    .returning({ value: documentNumberCounters.lastValue });

  if (!counter) {
    throw new DomainError(
      "CONFLICT",
      `${kind === "invoice" ? "Invoice" : "Payment"} number range exhausted for ${year}`,
    );
  }

  return `${prefixes[kind]}-${year}-${String(counter.value).padStart(4, "0")}`;
}
