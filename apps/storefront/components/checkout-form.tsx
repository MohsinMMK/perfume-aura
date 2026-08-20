"use client";

import { useRef, useState, type FormEvent } from "react";
import { load } from "@cashfreepayments/cashfree-js";
import { Button } from "@perfume-aura/ui/components/button";
import { Input } from "@perfume-aura/ui/components/input";
import type { DeliveryProfileInput } from "@/lib/customer-profile";
import { formatMoney } from "@/lib/money";
import { useCart } from "./cart-provider";

const fields = [
  ["checkout-name", "Recipient name", "recipientName", "text", "name"],
  ["checkout-phone", "Indian mobile number", "phone", "tel", "tel"],
  ["checkout-address-1", "Address line 1", "addressLine1", "text", "address-line1"],
  ["checkout-address-2", "Address line 2 (optional)", "addressLine2", "text", "address-line2"],
  ["checkout-city", "City", "city", "text", "address-level2"],
  ["checkout-state", "State", "state", "text", "address-level1"],
  ["checkout-postal", "PIN code", "postalCode", "text", "postal-code"],
] as const;

type CheckoutResponse = Readonly<{
  orderNumber?: string;
  accountOrderPath?: string;
  cashfreePaymentSessionId?: string;
  cashfreeMode?: "sandbox" | "production";
  code?: "CART_CHANGED";
  error?: string;
}>;

export function CheckoutForm({
  email,
  initialProfile,
}: Readonly<{
  email: string;
  initialProfile: DeliveryProfileInput | null;
}>) {
  const { cart, loading, refreshCart } = useCart();
  const requestId = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabled = Boolean(cart?.checkoutEnabled && cart.lines.length > 0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled) return;
    setPending(true);
    setError(null);
    requestId.current ??= crypto.randomUUID();
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestId.current,
          recipientName: formData.get("recipientName"),
          phone: formData.get("phone"),
          addressLine1: formData.get("addressLine1"),
          addressLine2: formData.get("addressLine2"),
          city: formData.get("city"),
          state: formData.get("state"),
          postalCode: formData.get("postalCode"),
          saveAddress: formData.get("saveAddress") === "on",
        }),
      });
      const result = (await response.json()) as CheckoutResponse;
      if (response.status === 409 && result.code === "CART_CHANGED") {
        requestId.current = null;
        await refreshCart();
        throw new Error(
          result.error ?? "Your cart changed. Review the updated items before continuing.",
        );
      }
      if (!response.ok) throw new Error(result.error ?? "Checkout failed");
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
        <h1 className="mt-3 font-display text-6xl sm:text-8xl">Almost yours.</h1>
        {!enabled ? (
          <div id="checkout-gate" role="status" className="mt-7 border border-[var(--aura-brass)] bg-[var(--aura-ivory)] p-4 text-sm leading-6">
            {cart?.checkoutBlockReason ?? "Checkout is loading or the cart is empty."}
          </div>
        ) : null}
        <div className="mt-9 grid gap-5 sm:grid-cols-2" aria-describedby={!enabled ? "checkout-gate" : undefined}>
          <div className="sm:col-span-2">
            <label htmlFor="checkout-email" className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]">Verified email</label>
            <Input id="checkout-email" value={email} readOnly aria-readonly="true" className="min-h-12 rounded-none border-black/25 bg-black/5" />
          </div>
          {fields.map(([id, label, name, type, autoComplete], index) => (
            <div key={id} className={index === 2 || index === 3 ? "sm:col-span-2" : undefined}>
              <label htmlFor={id} className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]">{label}</label>
              <Input
                id={id}
                name={name}
                type={type}
                autoComplete={autoComplete}
                defaultValue={initialProfile?.[name] ?? ""}
                className="min-h-12 rounded-none border-black/25 bg-transparent"
                required={name !== "addressLine2"}
                disabled={!enabled || pending}
              />
            </div>
          ))}
          <label className="flex min-h-12 items-center gap-3 text-sm sm:col-span-2">
            <input type="checkbox" name="saveAddress" disabled={!enabled || pending} />
            Save this as my delivery address
          </label>
        </div>
      </div>
      <aside className="border border-black/20 bg-[#fbf8f2] p-6 lg:sticky lg:top-28 lg:self-start">
        <h2 className="font-display text-3xl">Pay by UPI</h2>
        <p className="mt-3 text-sm leading-6 text-[#5f584f]">
          Cashfree opens UPI Intent on supported phones and a dynamic UPI QR on desktop. Pay with Google Pay, PhonePe, Paytm, or any supported UPI app.
        </p>
        <div className="mt-6 flex justify-between border-t border-black/20 pt-4 text-sm">
          <span>Subtotal</span><strong>{cart ? formatMoney(cart.subtotal) : "—"}</strong>
        </div>
        <p className="mt-3 text-xs leading-5 text-[#655f57]">Shipping and tax totals are checked again before the order is created. Cash on delivery is not available.</p>
        <Button type="submit" className="mt-6 min-h-12 w-full rounded-none" disabled={!enabled || pending || loading} focusableWhenDisabled={pending}>
          {pending ? "Opening UPI…" : "Continue to UPI"}
        </Button>
        {error ? <p className="mt-3 text-sm text-red-800" role="alert">{error}</p> : null}
      </aside>
    </form>
  );
}
