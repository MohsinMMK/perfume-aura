import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { InquiryStatusForm } from "@/components/commerce/inquiry-status-form";
import { ReturnStatusForm } from "@/components/commerce/return-status-form";
import { DbUnavailableState } from "@/components/db-empty-state";
import { PageHeader } from "@/components/page-header";
import { listCommerceSupport } from "@/lib/commerce";
import { safeDbQuery } from "@/lib/db-safe";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CommerceSupportPage() {
  await requireCapability("commerce.support.manage", { redirectToLogin: true });
  const result = await safeDbQuery(() => listCommerceSupport());

  return (
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Customer support & returns"
        description="Contact, wholesale, return, and RTO work stay linked to accountable owner workflows."
      />
      {result.error || !result.data ? (
        <DbUnavailableState message={result.error ?? "No data returned."} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <VStack gap={4}>
              <VStack gap={1}>
                <Heading level={2}>Inquiries</Heading>
                <Text as="p" color="secondary">{result.data.inquiries.length} recent. Status changes are written to the operations audit trail.</Text>
              </VStack>
              {result.data.inquiries.length === 0 ? (
                <Text as="p" color="secondary">No inquiries have been received. New contact and wholesale messages will appear here after the public gate opens.</Text>
              ) : result.data.inquiries.map((item) => (
                <article key={item.id} className="rounded-md border border-border p-4">
                  <VStack gap={3}>
                    <HStack justify="between" align="start" gap={2} wrap="wrap">
                      <VStack gap={1}>
                        <Text as="span" weight="semibold">{item.name}</Text>
                        <Text as="p" type="supporting">{item.email}{item.businessName ? ` · ${item.businessName}` : ""}</Text>
                      </VStack>
                      <HStack gap={2} wrap="wrap">
                        <Token size="sm" label={`${item.kind} · ${item.status.replace("_", " ")}`} color="gray" />
                        <Token size="sm" label={`notification ${item.notificationStatus ?? "not queued"}${item.notificationAttemptCount ? ` · ${item.notificationAttemptCount}` : ""}`} color="default" />
                      </HStack>
                    </HStack>
                    <details className="text-sm">
                      <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium text-primary underline-offset-4 hover:underline">Read message</summary>
                      <p className="mt-2 whitespace-pre-wrap leading-6 text-body">{item.message}</p>
                    </details>
                    <Text as="p" type="supporting">Received {item.createdAt.toLocaleString("en-IN")} · consent {item.consentVersion}</Text>
                    <InquiryStatusForm inquiryId={item.id} status={item.status} updatedAt={item.updatedAt.toISOString()} />
                  </VStack>
                </article>
              ))}
            </VStack>
          </Card>
          <Card>
            <VStack gap={4}>
              <VStack gap={1}>
                <Heading level={2}>Returns</Heading>
                <Text as="p" color="secondary">{result.data.returns.length} recent. Refund completion remains provider-verified.</Text>
              </VStack>
              {result.data.returns.length === 0 ? (
                <Text as="p" color="secondary">No return requests are waiting for review.</Text>
              ) : result.data.returns.map((item) => (
                <article key={item.id} className="rounded-md border border-border p-3">
                  <VStack gap={2}>
                    <HStack justify="between" gap={2}>
                      <Text as="span" weight="semibold">Order {item.orderNumber}</Text>
                      <Token size="sm" label={item.status} color="gray" />
                    </HStack>
                    <Text as="p">{item.reason}</Text>
                    {item.customerNotes ? <Text as="p" color="secondary" className="whitespace-pre-wrap">{item.customerNotes}</Text> : null}
                    <Text as="p" type="supporting">Requested {item.requestedAt.toLocaleString("en-IN")}</Text>
                    <div className="mt-1">
                      <ReturnStatusForm returnId={item.id} status={item.status} />
                    </div>
                  </VStack>
                </article>
              ))}
            </VStack>
          </Card>
        </div>
      )}
    </VStack>
  );
}
