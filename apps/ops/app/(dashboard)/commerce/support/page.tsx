import { Badge } from "@perfume-aura/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@perfume-aura/ui/components/card";
import { DbUnavailableState } from "@/components/db-empty-state";
import { listCommerceSupport } from "@/lib/commerce";
import { safeDbQuery } from "@/lib/db-safe";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";
export default async function CommerceSupportPage() {
  await requireCapability("commerce.support.manage", { redirectToLogin: true });
  const result = await safeDbQuery(() => listCommerceSupport());
  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6"><div><h1 className="font-heading text-2xl font-semibold tracking-tight">Customer support & returns</h1><p className="mt-1 text-sm text-muted-foreground">Contact, wholesale, return, and RTO work stay linked to accountable owner workflows.</p></div>{result.error || !result.data ? <DbUnavailableState message={result.error ?? "No data returned."} /> : <div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle>Inquiries</CardTitle><CardDescription>{result.data.inquiries.length} recent</CardDescription></CardHeader><CardContent className="grid gap-3">{result.data.inquiries.map((item) => <div key={item.id} className="rounded-md border p-3"><div className="flex justify-between gap-2"><strong className="text-sm">{item.name}</strong><Badge variant="secondary">{item.kind} · {item.status}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{item.email}</p><p className="mt-2 line-clamp-3 text-sm">{item.message}</p></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Returns</CardTitle><CardDescription>{result.data.returns.length} recent</CardDescription></CardHeader><CardContent className="grid gap-3">{result.data.returns.map((item) => <div key={item.id} className="rounded-md border p-3"><div className="flex justify-between gap-2"><strong className="text-sm">Order {item.orderId.slice(0, 8)}</strong><Badge variant="secondary">{item.status}</Badge></div><p className="mt-2 text-sm">{item.reason}</p></div>)}</CardContent></Card></div>}</div>;
}
