import type { Metadata } from "next";
import Link from "next/link";
import { AccountForm } from "@/components/account-form";
import { customerAuthProviderReadiness } from "@/lib/customer-auth-policy";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };
export default function SignInPage() { const enabled = process.env.STOREFRONT_CUSTOMER_AUTH_ENABLED === "true"; return <><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#79633e]">Customer account</p><h1 className="mt-3 font-display text-6xl sm:text-8xl">Welcome back.</h1><AccountForm mode="sign-in" enabled={enabled} providers={customerAuthProviderReadiness()} /><Link href="/account/recover" className="mt-5 inline-flex min-h-11 items-center text-sm underline underline-offset-4">Forgot your password?</Link></>; }
