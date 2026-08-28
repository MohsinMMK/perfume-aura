import type { Metadata } from "next";
import localFont from "next/font/local";
import { StorefrontShell } from "@/components/storefront-shell";
import { getOptionalEmbeddedBuildSourceCommit } from "@/lib/build-version";
import { defaultSiteDescription, siteName } from "@/lib/seo";
import "./globals.css";

export const dynamic = "force-dynamic";

const interTight = localFont({
  src: [
    {
      path: "../node_modules/@fontsource-variable/inter-tight/files/inter-tight-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource-variable/inter-tight/files/inter-tight-latin-wght-italic.woff2",
      weight: "100 900",
      style: "italic",
    },
  ],
  variable: "--font-inter-tight",
  display: "swap",
  fallback: ["Arial"],
  adjustFontFallback: "Arial",
  preload: true,
});

const londrinaSolid = localFont({
  src: "../node_modules/@fontsource/londrina-solid/files/londrina-solid-latin-400-normal.woff2",
  variable: "--font-londrina-solid",
  display: "swap",
  fallback: ["Arial"],
  adjustFontFallback: "Arial",
  weight: "400",
  preload: true,
});

const londrinaOutline = localFont({
  src: "../node_modules/@fontsource/londrina-outline/files/londrina-outline-latin-400-normal.woff2",
  variable: "--font-londrina-outline",
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
    default: "Perfume Aura | Perfume store in Kondapur, Hyderabad",
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
    title: "Perfume Aura | Perfume store in Kondapur, Hyderabad",
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
    title: "Perfume Aura | Perfume store in Kondapur, Hyderabad",
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
      lang="en-IN"
      className={`${interTight.variable} ${londrinaSolid.variable} ${londrinaOutline.variable}`}
      data-scroll-behavior="auto"
      data-perfume-aura-release={releaseCommit}
    >
      <body className="min-h-full antialiased">
        <StorefrontShell>{children}</StorefrontShell>
      </body>
    </html>
  );
}
