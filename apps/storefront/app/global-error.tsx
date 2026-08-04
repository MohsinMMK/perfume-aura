"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-svh items-center justify-center bg-[#f4f0e8] p-6 text-[#171511]">
        <main className="w-full max-w-md border border-black/20 bg-[#faf7f1] p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#79633e]">
            Perfume Aura
          </p>
          <h1 className="mt-3 text-4xl">Something went wrong</h1>
          <p className="mt-3 text-sm leading-6 text-[#5f584f]">
            The error was reported. Please try this page again.
          </p>
          <button
            type="button"
            className="mt-6 min-h-11 border border-black/25 px-5 text-sm font-semibold"
            onClick={reset}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
