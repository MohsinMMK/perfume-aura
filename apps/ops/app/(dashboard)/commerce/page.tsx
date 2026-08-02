import Link from "next/link";
import { Badge } from "@perfume-aura/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@perfume-aura/ui/components/card";
import { DbUnavailableState } from "@/components/db-empty-state";
import { safeDbQuery } from "@/lib/db-safe";
import { getCommerceOverview } from "@/lib/commerce";
import { requireOwnerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CommercePage() {
  await requireOwnerSession({ redirectToLogin: true });
  const result = await safeDbQuery(() => getCommerceOverview());
  const metrics = result.data
    ? [
        ["Catalog gates", result.data.catalogBlocked, "/commerce/catalog"],
        ["Open orders", result.data.openOrders, "/commerce/orders"],
        ["Payment attention", result.data.paymentAttention, "/commerce/orders"],
        ["Pending reviews", result.data.pendingReviews, "/commerce/reviews"],
        ["New inquiries", result.data.newInquiries, "/commerce/support"],
        ["Open returns", result.data.openReturns, "/commerce/support"],
      ] as const
    : [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Storefront commerce</h1>
          <p className="mt-1 text-sm text-muted-foreground">Catalog approval, customer orders, fulfillment, and release gates.</p>
        </div>
        <Badge variant={result.data?.checkoutEnabled ? "default" : "secondary"}>
          Checkout {result.data?.checkoutEnabled ? "enabled" : "gated"}
        </Badge>
      </div>
      {result.error || !result.data ? <DbUnavailableState message={result.error ?? "No data returned."} /> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(([label, value, href]) => (
          <Link key={label} href={href} className="group">
            <Card className="h-full transition-colors group-hover:ring-foreground/20">
              <CardHeader><CardDescription>{label}</CardDescription><CardTitle className="text-3xl tabular-nums">{value}</CardTitle></CardHeader>
            </Card>
          </Link>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Release sequence</CardTitle><CardDescription>The store remains fail-closed until every independent gate is proven.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Approve each product’s legal, content, media, SKU, stock, cost, and price data.",
            "Approve shipping, returns, cancellation, tax, and support settings.",
            "Verify Cashfree, customer-auth, OAuth, email, and production callback domains.",
            "Run the authorized prepaid and COD lifecycle acceptance tests before release.",
          ].map((text, index) => <p key={text} className="rounded-md border p-4"><span className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">Gate {index + 1}</span>{text}</p>)}
        </CardContent>
      </Card>
    </div>
  );
}
