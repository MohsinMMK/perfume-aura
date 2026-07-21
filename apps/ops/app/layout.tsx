import type { Metadata } from "next";
import { IBM_Plex_Sans, Raleway } from "next/font/google";
import { Toaster } from "@perfume-aura/ui/components/sonner";
import { TooltipProvider } from "@perfume-aura/ui/components/tooltip";
import "./globals.css";
import { cn } from "@perfume-aura/ui/lib/utils";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const ralewayHeading = Raleway({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: {
    default: "Perfume Aura Ops",
    template: "%s · Perfume Aura Ops",
  },
  description: "Internal inventory, invoicing, and finance for Perfume Aura.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "dark h-full font-sans antialiased",
        ibmPlexSans.variable,
        ralewayHeading.variable,
      )}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <TooltipProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </TooltipProvider>
      </body>
    </html>
  );
}
