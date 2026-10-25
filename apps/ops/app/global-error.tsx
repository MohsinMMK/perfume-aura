"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { AstryxProviders } from "@/components/astryx/providers";
import "./layers.css";
import "./globals.css";

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

  // The root layout (and its theme cookie) is replaced here, so the page
  // follows the operating-system colour scheme.
  return (
    <html lang="en">
      <body className="bg-body text-primary">
        <AstryxProviders initialMode="system">
          <div className="flex min-h-svh items-center justify-center p-6">
            <main className="w-full max-w-md">
              <Card padding={8}>
                <VStack gap={4} align="center" className="text-center">
                  <Text type="label" color="secondary">
                    Perfume Aura Operations
                  </Text>
                  <Heading level={1}>Something went wrong</Heading>
                  <Text as="p" color="secondary">
                    The error was reported. Try the page again, or sign in again
                    if the problem continues.
                  </Text>
                  <Button
                    type="button"
                    variant="primary"
                    label="Try again"
                    onClick={reset}
                  />
                </VStack>
              </Card>
            </main>
          </div>
        </AstryxProviders>
      </body>
    </html>
  );
}
