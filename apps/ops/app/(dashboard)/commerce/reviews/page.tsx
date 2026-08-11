import { Badge } from "@perfume-aura/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@perfume-aura/ui/components/card";
import { DbUnavailableState } from "@/components/db-empty-state";
import { listCommerceReviews } from "@/lib/commerce";
import { safeDbQuery } from "@/lib/db-safe";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";
export default async function CommerceReviewsPage() {
  await requireCapability("commerce.reviews.moderate", { redirectToLogin: true });
  const result = await safeDbQuery(() => listCommerceReviews());
  return <div className="mx-auto flex w-full max-w-4xl flex-col gap-6"><div><h1 className="font-heading text-2xl font-semibold tracking-tight">Verified review moderation</h1><p className="mt-1 text-sm text-muted-foreground">Only fulfilled-order-item reviews can enter this queue; publication remains moderated.</p></div>{result.error || !result.data ? <DbUnavailableState message={result.error ?? "No data returned."} /> : result.data.map((review) => <Card key={review.id}><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle className="text-base">{review.title ?? "Untitled review"}</CardTitle><Badge variant={review.status === "approved" ? "default" : "secondary"}>{review.status}</Badge></div><CardDescription>{review.rating}/5 · {review.createdAt.toLocaleDateString("en-IN")}</CardDescription></CardHeader><CardContent><p className="text-sm leading-6">{review.body}</p></CardContent></Card>)}</div>;
}
