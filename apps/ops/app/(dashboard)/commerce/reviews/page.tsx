import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { ReviewModerationForm } from "@/components/commerce/review-moderation-form";
import { DbUnavailableState } from "@/components/db-empty-state";
import { PageHeader } from "@/components/page-header";
import { listCommerceReviews } from "@/lib/commerce";
import { safeDbQuery } from "@/lib/db-safe";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";

function reviewColor(status: string) {
  if (status === "approved") return "green" as const;
  if (status === "rejected") return "red" as const;
  return "orange" as const;
}

export default async function CommerceReviewsPage() {
  await requireCapability("commerce.reviews.moderate", { redirectToLogin: true });
  const result = await safeDbQuery(() => listCommerceReviews());
  return (
    <VStack gap={6} className="mx-auto w-full max-w-4xl">
      <PageHeader
        title="Verified review moderation"
        description="Only fulfilled-order-item reviews can enter this queue; publication remains moderated."
      />
      {result.error || !result.data ? <DbUnavailableState message={result.error ?? "No data returned."} /> : result.data.map((review) => (
        <Card key={review.id}>
          <VStack gap={5}>
            <VStack gap={1}>
              <HStack justify="between" align="center" gap={3}>
                <Heading level={2}>{review.title ?? "Untitled review"}</Heading>
                <Token size="sm" label={review.status} color={reviewColor(review.status)} />
              </HStack>
              <Text as="p" color="secondary" hasTabularNumbers>{review.rating}/5 · {review.createdAt.toLocaleDateString("en-IN")}</Text>
            </VStack>
            <Text as="p" className="leading-6">{review.body}</Text>
            <ReviewModerationForm reviewId={review.id} status={review.status} />
          </VStack>
        </Card>
      ))}
    </VStack>
  );
}
