"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { load } from "@cashfreepayments/cashfree-js";
import { Button } from "@perfume-aura/ui/components/button";
import { Input } from "@perfume-aura/ui/components/input";
import { formatMoney } from "@/lib/money";
import { useCart } from "./cart-provider";

const fields = [
  ["checkout-email", "Email", "email", "email", "email"],
  ["checkout-name", "Full name", "name", "text", "name"],
  ["checkout-phone", "Phone", "phone", "tel", "tel"],
  ["checkout-address", "Address", "address", "text", "street-address"],
  ["checkout-city", "City", "city", "text", "address-level2"],
  ["checkout-postal", "PIN code", "postalCode", "text", "postal-code"],
] as const;

type CheckoutResponse = Readonly<{
  orderToken: string;
  orderNumber: string;
  paymentMethod: "cashfree" | "cod";
  cashfreePaymentSessionId?: string;
  cashfreeMode?: "sandbox" | "production";
  error?: string;
}>;

export function CheckoutForm() {
  const router = useRouter();
  const { cart, loading } = useCart();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabled = Boolean(cart?.checkoutEnabled && cart.lines.length > 0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled) return;
    setPending(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          email: formData.get("email"),
          name: formData.get("name"),
          phone: formData.get("phone"),
          address: formData.get("address"),
          city: formData.get("city"),
          postalCode: formData.get("postalCode"),
          paymentMethod: formData.get("paymentMethod"),
        }),
      });
      const result = (await response.json()) as CheckoutResponse;
      if (!response.ok) throw new Error(result.error ?? "Checkout failed");
      if (result.paymentMethod === "cod") {
        router.push(`/order/${result.orderToken}`);
        return;
      }
      if (!result.cashfreePaymentSessionId || !result.cashfreeMode) {
        throw new Error("Cashfree payment session was not returned");
      }
      const cashfree = await load({ mode: result.cashfreeMode });
      if (!cashfree) throw new Error("Cashfree checkout could not be loaded");
      const checkoutResult = await cashfree.checkout({
        paymentSessionId: result.cashfreePaymentSessionId,
        redirectTarget: "_self",
      });
      if (checkoutResult.error) {
        throw new Error(checkoutResult.error.message ?? "Cashfree checkout failed");
      }
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : "Checkout failed");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_24rem]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#79633e]">Secure checkout</p>
        <h1 className="mt-3 font-[var(--font-playfair)] text-6xl sm:text-8xl">Almost yours.</h1>
        {!enabled ? (
          <div id="checkout-gate" role="status" className="mt-7 border border-[var(--aura-brass)] bg-[var(--aura-ivory)] p-4 text-sm leading-6">
            {cart?.checkoutBlockReason ?? "Checkout is loading or the cart is empty."}
          </div>
        ) : null}
        <div className="mt-9 grid gap-5 sm:grid-cols-2" aria-describedby={!enabled ? "checkout-gate" : undefined}>
          {fields.map(([id, label, name, type, autoComplete], index) => (
            <div key={id} className={index === 0 || index === 3 ? "sm:col-span-2" : undefined}>
              <label htmlFor={id} className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]">{label}</label>
              <Input id={id} name={name} type={type} autoComplete={autoComplete} className="min-h-12 rounded-none border-black/25 bg-transparent" required disabled={!enabled || pending} />
            </div>
          ))}
        </div>
      </div>
      <aside className="border border-black/20 bg-[#fbf8f2] p-6 lg:sticky lg:top-28 lg:self-start">
        <h2 className="font-[var(--font-playfair)] text-3xl">Payment</h2>
        <fieldset className="mt-5 grid gap-3" disabled={!enabled || pending}>
          <legend className="sr-only">Payment method</legend>
          <label className="flex min-h-12 items-center gap-3 border border-black/20 px-3 text-sm"><input type="radio" name="paymentMethod" value="cashfree" defaultChecked />Cashfree prepaid</label>
          <label className="flex min-h-12 items-center gap-3 border border-black/20 px-3 text-sm"><input type="radio" name="paymentMethod" value="cod" />Cash on delivery</label>
        </fieldset>
        <div className="mt-6 flex justify-between border-t border-black/20 pt-4 text-sm"><span>Subtotal</span><strong>{cart ? formatMoney(cart.subtotal) : "—"}</strong></div>
        <p className="mt-3 text-xs leading-5 text-[#655f57]">Approved delivery and tax rules are recalculated on the server before the order is created.</p>
        <Button type="submit" className="mt-6 min-h-12 w-full rounded-none" disabled={!enabled || pending || loading} focusableWhenDisabled={pending}>
          {pending ? "Creating order…" : "Place order"}
        </Button>
        {error ? <p className="mt-3 text-sm text-red-800" role="alert">{error}</p> : null}
      </aside>
    </form>
  );
}
