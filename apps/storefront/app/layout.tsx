import type { Metadata } from "next";
import localFont from "next/font/local";
import { StorefrontShell } from "@/components/storefront-shell";
import { getOptionalEmbeddedBuildSourceCommit } from "@/lib/build-version";
import { defaultSiteDescription, siteName } from "@/lib/seo";
import "./globals.css";

export const dynamic = "force-dynamic";

const interTight = localFont({
  src: "../node_modules/@fontsource-variable/inter-tight/files/inter-tight-latin-wght-normal.woff2",
  variable: "--font-inter-tight",
  display: "swap",
  fallback: ["Arial"],
  adjustFontFallback: "Arial",
  preload: true,
});

const bebasNeue = localFont({
  src: "../node_modules/@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2",
  variable: "--font-bebas-neue",
  display: "swap",
  fallback: ["Arial"],
  adjustFontFallback: "Arial",
  weight: "400",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.STOREFRONT_URL ?? "https://perfumeaura.com",
  ),
  title: {
    default: "Perfume Aura | Fragrance house in India",
    template: `%s · ${siteName}`,
  },
  description: defaultSiteDescription,
  applicationName: siteName,
  authors: [{ name: siteName, url: "/about" }],
  creator: siteName,
  publisher: siteName,
  category: "fragrance",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName,
    title: "Perfume Aura | Fragrance house in India",
    description: defaultSiteDescription,
    images: [
      {
        url: "/images/hero-bottle-still-life.webp",
        width: 1686,
        height: 933,
        alt: "Perfume Aura fragrance bottles arranged on a dark stone plinth",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Perfume Aura | Fragrance house in India",
    description: defaultSiteDescription,
    images: ["/images/hero-bottle-still-life.webp"],
  },
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
      <body className={`${interTight.variable} ${bebasNeue.variable} min-h-full antialiased`}>
        <StorefrontShell>{children}</StorefrontShell>
      </body>
    </html>
  );
}
