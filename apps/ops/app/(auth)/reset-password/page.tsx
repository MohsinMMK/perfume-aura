import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = {
  title: "Reset password",
  description: "Set a new owner password",
};

export default function ResetPasswordPage() {
  return (
    <main className="w-full max-w-sm">
      <Card padding={6}>
        <VStack gap={6}>
          <VStack gap={2}>
            <Text type="label" color="secondary">Perfume Aura</Text>
            <Heading level={1}>Choose a new password</Heading>
            <Text as="p" color="secondary">
              Reset links are single-use and expire after 30 minutes.
            </Text>
          </VStack>
          <ResetPasswordForm />
        </VStack>
      </Card>
    </main>
  );
}
