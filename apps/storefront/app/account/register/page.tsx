import type { Metadata } from "next";
import { AccountForm } from "@/components/account-form";
import { customerAuthProviderReadiness } from "@/lib/customer-auth-policy";

export const metadata: Metadata = { title: "Create account", robots: { index: false, follow: false } };
export default function RegisterPage() { const enabled = process.env.STOREFRONT_CUSTOMER_AUTH_ENABLED === "true"; return <><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#79633e]">Customer account</p><h1 className="mt-3 font-[var(--font-playfair)] text-6xl sm:text-8xl">Keep your favourites close.</h1><AccountForm mode="register" enabled={enabled} providers={customerAuthProviderReadiness()} /></>; }
