import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { TwoFactorChallengeForm } from "@/components/auth/two-factor-challenge-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Verify sign-in",
  description: "Verify your Perfume Aura operations sign-in",
};

export default function TwoFactorPage() {
  return (
    <main className="w-full max-w-[28rem]">
      <Card padding={6}>
        <VStack gap={6}>
          <VStack gap={2}>
            <Text type="label" color="secondary">Perfume Aura Operations</Text>
            <Heading level={1}>Verify your sign-in</Heading>
            <Text as="p" color="secondary">
              Enter a code from your authenticator app or one unused recovery code.
            </Text>
          </VStack>
          <TwoFactorChallengeForm />
        </VStack>
      </Card>
    </main>
  );
}
