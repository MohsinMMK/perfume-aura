import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { cookies } from "next/headers";
import "./layers.css";
import "./globals.css";
import { AstryxProviders } from "@/components/astryx/providers";
import { parseThemeMode, themeModeCookie } from "@/lib/theme-mode";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  title: {
    default: "Perfume Aura Ops",
    template: "%s · Perfume Aura Ops",
  },
  description: "Internal inventory, invoicing, and finance for Perfume Aura.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const mode = parseThemeMode((await cookies()).get(themeModeCookie)?.value);

  return (
    <html
      lang="en"
      className={figtree.variable}
      data-theme={mode === "system" ? undefined : mode}
    >
      <body>
        <AstryxProviders initialMode={mode}>{children}</AstryxProviders>
      </body>
    </html>
  );
}
