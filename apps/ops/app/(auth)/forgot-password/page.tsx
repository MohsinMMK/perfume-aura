import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = {
  title: "Forgot password",
  description: "Request a secure owner password reset",
};

export default function ForgotPasswordPage() {
  return (
    <main className="w-full max-w-sm">
      <Card padding={6}>
        <VStack gap={6}>
          <VStack gap={2}>
            <Text type="label" color="secondary">Perfume Aura</Text>
            <Heading level={1}>Reset owner password</Heading>
            <Text as="p" color="secondary">
              Request a single-use link sent through the configured owner mailbox.
            </Text>
          </VStack>
          <ForgotPasswordForm />
        </VStack>
      </Card>
    </main>
  );
}
