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
    <html lang="en" className="dark">
      <body className="flex min-h-svh items-center justify-center bg-background p-6 text-foreground">
        <main className="w-full max-w-md border border-border bg-card p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Perfume Aura Operations
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Something went wrong</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The error was reported. Try the page again, or sign in again if the
            problem continues.
          </p>
          <button
            type="button"
            className="mt-6 min-h-11 border border-border px-5 text-sm font-medium"
            onClick={reset}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
