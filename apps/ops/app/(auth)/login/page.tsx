import Link from "next/link";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign in",
  description: "Owner and staff sign-in for Perfume Aura operations",
};

export default function LoginPage() {
  return (
    <main className="w-full max-w-[28rem]">
      <VStack gap={6} align="center">
        <Card padding={6} className="w-full">
          <VStack gap={6}>
            <VStack gap={2}>
              <Text type="label" color="secondary">Perfume Aura Operations</Text>
              <Heading level={1}>Sign in to operations</Heading>
              <Text as="p" color="secondary">
                Private access for the owner and invited staff. Customer accounts are managed separately on the storefront.
              </Text>
            </VStack>
            <LoginForm />
          </VStack>
        </Card>
        <Link
          href="https://perfumeaura.com"
          className="inline-flex min-h-11 items-center text-sm text-secondary underline-offset-4 hover:text-primary hover:underline"
        >
          Return to the customer storefront
        </Link>
      </VStack>
    </main>
  );
}
