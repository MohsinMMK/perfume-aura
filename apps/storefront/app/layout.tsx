import type { Metadata } from "next";
import localFont from "next/font/local";
import { cn } from "@perfume-aura/ui/lib/utils";
import { StorefrontShell } from "@/components/storefront-shell";
import { getOptionalEmbeddedBuildSourceCommit } from "@/lib/build-version";
import "./globals.css";

const manrope = localFont({
  src: "./fonts/manrope-latin.woff2",
  variable: "--font-manrope",
  display: "swap",
  weight: "200 800",
});

const playfairDisplay = localFont({
  src: "./fonts/playfair-display-latin.woff2",
  variable: "--font-playfair",
  display: "swap",
  weight: "400 900",
});

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
      <body
        className={cn(
          "min-h-full antialiased",
          manrope.variable,
          playfairDisplay.variable,
        )}
      >
        <StorefrontShell>{children}</StorefrontShell>
      </body>
    </html>
  );
}
