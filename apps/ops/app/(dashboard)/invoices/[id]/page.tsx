import { notFound, redirect } from "next/navigation";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { getInvoice } from "@/lib/invoices";
import { listActiveVariantsForSelect } from "@/lib/products";
import { listPayments } from "@/lib/payments";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr, formatQty } from "@/lib/money";
import { AddInvoiceLineForm } from "@/components/invoices/add-line-form";
import {
  InvoiceStatusActions,
  RemoveLineButton,
} from "@/components/invoices/invoice-actions";
import { RecordPaymentForm } from "@/components/invoices/record-payment-form";
import { DbUnavailableState } from "@/components/db-empty-state";
import { formatBusinessDateTime } from "@/lib/business-date";
import { hasOpsCapability } from "@/lib/ops-access";
import { requireCapability } from "@/lib/session";
import {
  canonicalPage,
  paginationHref,
  parsePage,
} from "@/lib/pagination";
import { PaginationNav } from "@/components/pagination-nav";
import { InvoiceShareActions } from "@/components/invoices/invoice-share-actions";
import { createInvoiceWhatsAppUrl } from "@/lib/invoice-sharing";
import { ReceiveReturnForm } from "@/components/invoices/receive-return-form";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";

export const dynamic = "force-dynamic";

function statusColor(status: string): "gray" | "blue" | "green" | "red" {
  switch (status) {
    case "issued":
      return "blue";
    case "paid":
      return "green";
    case "void":
      return "red";
    default:
      return "gray";
  }
}

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireCapability("invoices.view", {
    redirectToLogin: true,
  });
  const canDraft = hasOpsCapability(session.user.role, "invoices.draft");
  const canIssue = hasOpsCapability(session.user.role, "invoices.issue");
  const canFulfill = hasOpsCapability(session.user.role, "invoices.fulfill");
  const canVoid = hasOpsCapability(session.user.role, "invoices.void");
  const canRecordPayment = hasOpsCapability(
    session.user.role,
    "payments.record",
  );
  const canReceiveReturns = hasOpsCapability(session.user.role, "stock.adjust");
  const { id } = await params;
  const resolvedSearch = await searchParams;
  const paymentsPage = parsePage(resolvedSearch.paymentsPage);
  const preservedSearch = { ...resolvedSearch };
  delete preservedSearch.paymentsPage;
  const [invResult, variantsResult, paymentsResult] = await Promise.all([
    safeDbQuery(() => getInvoice(id)),
    canDraft
      ? safeDbQuery(() => listActiveVariantsForSelect())
      : Promise.resolve({ data: [], error: null }),
    canRecordPayment
      ? safeDbQuery(() => listPayments({ invoiceId: id, page: paymentsPage }))
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (invResult.error) {
    return <DbUnavailableState message={invResult.error} />;
  }
  if (!invResult.data) notFound();

  const inv = invResult.data;
  if (paymentsResult.data) {
    const canonical = canonicalPage(
      paymentsResult.data.page,
      paymentsResult.data.totalPages,
      paymentsResult.data.total,
    );
    if (canonical) {
      redirect(
        paginationHref(
          `/invoices/${id}`,
          canonical,
          preservedSearch,
          "paymentsPage",
        ),
      );
    }
  }
  const variants = (variantsResult.data ?? []).map((v) => ({
    id: v.id,
    label: v.label,
    retailRupees: v.retailCents / 100,
  }));
  const paymentRows = paymentsResult.data?.items ?? [];
  const whatsappUrl =
    inv.number && inv.customerPhone
      ? createInvoiceWhatsAppUrl({
          invoiceNumber: inv.number,
          customerName: inv.customerName,
          customerPhone: inv.customerPhone,
          total: formatInr(inv.totalCents),
          balance: formatInr(inv.balanceCents),
          items: inv.lines.map(
            (line) => `${line.description} × ${formatQty(line.quantity)}`,
          ),
        })
      : null;

  const showLineActions = inv.status === "draft" && canDraft;
  const totals = [
    { label: "Subtotal", cents: inv.subtotalCents },
    { label: "Total", cents: inv.totalCents },
    { label: "Balance", cents: inv.balanceCents },
  ];

  return (
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <VStack gap={2}>
        <PageBreadcrumbs
          items={[
            { label: "Invoices", href: "/invoices" },
            { label: inv.number ?? "Draft invoice" },
          ]}
        />
        <HStack justify="between" align="start" gap={4} wrap="wrap">
          <VStack gap={1}>
            <Heading level={1}>{inv.number ?? "Draft invoice"}</Heading>
            <Text as="p" color="secondary">
              {inv.customerName}
              {inv.customerPhone ? ` · ${inv.customerPhone}` : ""}
            </Text>
            <HStack gap={2}>
              <Token
                size="sm"
                label={inv.status}
                color={statusColor(inv.status)}
              />
            </HStack>
          </VStack>
          <InvoiceStatusActions
            canFulfill={canFulfill}
            canIssue={canIssue}
            canRecordPayment={canRecordPayment}
            canVoid={canVoid}
            invoiceId={inv.id}
            status={inv.status}
          />
        </HStack>
      </VStack>

      {inv.status !== "draft" ? (
        <Card>
          <VStack gap={3}>
            <VStack gap={1}>
              <Heading level={2}>Share invoice</Heading>
              <Text as="p" color="secondary">
                Save the print view as a PDF, then open the prepared customer message and attach the PDF in WhatsApp.
              </Text>
            </VStack>
            <InvoiceShareActions invoiceId={inv.id} whatsappUrl={whatsappUrl} />
          </VStack>
        </Card>
      ) : null}

      <Grid columns={{ minWidth: 180, max: 3 }} gap={4}>
        {totals.map((total) => (
          <Card key={total.label}>
            <VStack gap={1}>
              <Text type="supporting">{total.label}</Text>
              <Text size="xl" weight="semibold" hasTabularNumbers>
                {formatInr(total.cents)}
              </Text>
            </VStack>
          </Card>
        ))}
      </Grid>

      <Card padding={0} className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Description</TableHeaderCell>
              <TableHeaderCell className="text-right">Qty</TableHeaderCell>
              <TableHeaderCell className="text-right">Unit</TableHeaderCell>
              <TableHeaderCell className="text-right">Line</TableHeaderCell>
              <TableHeaderCell className="text-right">Fulfilled</TableHeaderCell>
              <TableHeaderCell className="text-right">Returned</TableHeaderCell>
              {showLineActions ? (
                <TableHeaderCell>
                  <span className="sr-only">Actions</span>
                </TableHeaderCell>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {inv.lines.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showLineActions ? 7 : 6}
                  className="text-center"
                >
                  <Text color="secondary">No lines yet.</Text>
                </TableCell>
              </TableRow>
            ) : (
              inv.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.description}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQty(line.quantity)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInr(line.unitPriceCents)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInr(line.lineTotalCents)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQty(line.quantityFulfilled)}
                    {line.variantId ? "" : " · no SKU"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQty(line.quantityReturned)}
                  </TableCell>
                  {showLineActions ? (
                    <TableCell className="text-right">
                      <RemoveLineButton
                        invoiceId={inv.id}
                        lineId={line.id}
                      />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {showLineActions ? (
        <AddInvoiceLineForm invoiceId={inv.id} variants={variants} />
      ) : null}

      {inv.status === "issued" && canRecordPayment ? (
        <RecordPaymentForm
          key={inv.balanceCents}
          invoiceId={inv.id}
          balanceRupees={inv.balanceCents / 100}
        />
      ) : null}

      {(inv.status === "issued" || inv.status === "paid") && canReceiveReturns ? (
        <ReceiveReturnForm
          invoiceId={inv.id}
          lines={inv.lines
            .filter(
              (line) =>
                line.variantId &&
                line.quantityFulfilled - line.quantityReturned > 0,
            )
            .map((line) => ({
              id: line.id,
              description: line.description,
              quantityReturnable:
                line.quantityFulfilled - line.quantityReturned,
            }))}
        />
      ) : null}

      {canRecordPayment && paymentRows.length > 0 ? (
        <Card padding={0} className="overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <Heading level={2}>
              Payment history · {paymentsResult.data?.total ?? paymentRows.length}
            </Heading>
          </div>
          <Table hasHover>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Number</TableHeaderCell>
                <TableHeaderCell>Method</TableHeaderCell>
                <TableHeaderCell>When</TableHeaderCell>
                <TableHeaderCell className="text-right">Amount</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentRows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.number ?? p.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <Token size="sm" label={p.method} color="gray" />
                  </TableCell>
                  <TableCell>
                    <Text type="supporting">
                      {formatBusinessDateTime(p.paidAt)}
                    </Text>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInr(p.amountCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {paymentsResult.data ? (
            <PaginationNav
              pathname={`/invoices/${id}`}
              page={paymentsResult.data.page}
              totalPages={paymentsResult.data.totalPages}
              total={paymentsResult.data.total}
              search={preservedSearch}
              pageParam="paymentsPage"
            />
          ) : null}
        </Card>
      ) : null}

      {inv.notes ? (
        <Card>
          <VStack gap={2}>
            <Heading level={2}>Notes</Heading>
            <Text as="p" color="secondary" className="whitespace-pre-wrap">
              {inv.notes}
            </Text>
          </VStack>
        </Card>
      ) : null}
    </VStack>
  );
}
