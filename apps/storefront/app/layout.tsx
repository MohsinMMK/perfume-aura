import type { Metadata } from "next";
import { StorefrontShell } from "@/components/storefront-shell";
import { getOptionalEmbeddedBuildSourceCommit } from "@/lib/build-version";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.STOREFRONT_URL ?? "https://perfumeaura.com",
  ),
  title: {
    default: "Perfume Aura",
    template: "%s · Perfume Aura",
  },
  description:
    "Perfume Aura fragrances, composed for presence and finished in India.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const releaseCommit = getOptionalEmbeddedBuildSourceCommit();

  return (
    <html
      lang="en"
      data-scroll-behavior="auto"
      data-perfume-aura-release={releaseCommit}
    >
      <body className="min-h-full antialiased">
        <StorefrontShell>{children}</StorefrontShell>
      </body>
    </html>
  );
}
