import { notFound } from "next/navigation";
import { getInvoice } from "@/lib/invoices";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr, formatQty } from "@/lib/money";
import { formatBusinessDate } from "@/lib/business-date";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Print-friendly invoice (browser Print → Save as PDF).
 * Phase 2.1 lite — no react-pdf dependency.
 */
export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability("invoices.print", { redirectToLogin: true });
  const { id } = await params;
  const result = await safeDbQuery(() => getInvoice(id));
  if (result.error || !result.data) notFound();
  const inv = result.data;

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-black print:p-0">
      <style>{`
        @media print {
          body { background: white !important; }
          header, [data-slot="sidebar"], nav { display: none !important; }
        }
      `}</style>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-lg font-semibold">Perfume Aura</p>
          <p className="text-sm text-neutral-600">perfumeaura.com</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold">
            {inv.number ?? "DRAFT"}
          </p>
          <p className="text-sm uppercase tracking-wide">{inv.status}</p>
          {inv.issueDate ? (
            <p className="text-sm text-neutral-600">
              Issued {formatBusinessDate(inv.issueDate)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mb-8">
        <p className="text-xs font-medium uppercase text-neutral-500">Bill to</p>
        <p className="font-medium">{inv.customerName}</p>
        {inv.customerEmail ? (
          <p className="text-sm">{inv.customerEmail}</p>
        ) : null}
        {inv.customerPhone ? (
          <p className="text-sm">{inv.customerPhone}</p>
        ) : null}
      </div>

      <table className="mb-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-left">
            <th className="py-2 pr-2">Description</th>
            <th className="py-2 pr-2 text-right">Qty</th>
            <th className="py-2 pr-2 text-right">Unit</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {inv.lines.map((line) => (
            <tr key={line.id} className="border-b border-neutral-100">
              <td className="py-2 pr-2">{line.description}</td>
              <td className="py-2 pr-2 text-right tabular-nums">
                {formatQty(line.quantity)}
              </td>
              <td className="py-2 pr-2 text-right tabular-nums">
                {formatInr(line.unitPriceCents)}
              </td>
              <td className="py-2 text-right tabular-nums">
                {formatInr(line.lineTotalCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto flex w-48 flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatInr(inv.subtotalCents)}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Total (INR)</span>
          <span className="tabular-nums">{formatInr(inv.totalCents)}</span>
        </div>
        <div className="flex justify-between">
          <span>Paid</span>
          <span className="tabular-nums">{formatInr(inv.amountPaidCents)}</span>
        </div>
        <div className="flex justify-between border-t border-neutral-300 pt-1 font-semibold">
          <span>Balance</span>
          <span className="tabular-nums">{formatInr(inv.balanceCents)}</span>
        </div>
      </div>

      {inv.notes ? (
        <p className="mt-8 text-sm text-neutral-600 whitespace-pre-wrap">
          {inv.notes}
        </p>
      ) : null}

      <p className="mt-12 text-center text-xs text-neutral-400 print:hidden">
        Use browser Print → Save as PDF
      </p>
    </div>
  );
}
