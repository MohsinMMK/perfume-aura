import type { Metadata } from "next";
import { AccountSettingsControls } from "@/components/account-settings-controls";

export const metadata: Metadata = { title: "Account settings", robots: { index: false, follow: false } };
export default function AccountSettingsPage() { return <><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#79633e]">Customer account</p><h1 className="mt-3 font-display text-6xl sm:text-8xl">Settings</h1><AccountSettingsControls enabled={process.env.STOREFRONT_CUSTOMER_AUTH_ENABLED === "true"} /></>; }
