import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { TwoFactorEnrollmentForm } from "@/components/auth/two-factor-enrollment-form";
import { PageHeader } from "@/components/page-header";
import { isOpsTwoFactorRequired } from "@/lib/ops-security-policy";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Security",
  description: "Operations account security settings",
};

export default async function SecuritySettingsPage() {
  const session = await requireCapability("security.self", {
    redirectToLogin: true,
    allowPendingTwoFactor: true,
  });
  const twoFactorRequired = isOpsTwoFactorRequired();
  const hasTwoFactor = session.user.twoFactorEnabled === true;

  return (
    <VStack gap={6} className="mx-auto w-full max-w-4xl">
      <PageHeader
        title="Security"
        description="Manage your password, sessions, and required sign-in protection."
      />

      {!twoFactorRequired || hasTwoFactor ? (
        <Card padding={6}>
          <VStack gap={5}>
            <VStack gap={1}>
              <Heading level={2}>Password</Heading>
              <Text as="p" color="secondary">
                Recovery links are single-use and expire after 30 minutes.
              </Text>
            </VStack>
            <ChangePasswordForm />
          </VStack>
        </Card>
      ) : null}

      <Card padding={6}>
        <VStack gap={5}>
          <VStack gap={1}>
            <Heading level={2}>Authenticator app</Heading>
            <Text as="p" color="secondary">
              {hasTwoFactor
                ? "Two-factor authentication is active on this account."
                : twoFactorRequired
                  ? "Two-factor authentication is required before you can access operations."
                  : "Add an authenticator app and recovery codes to protect this account."}
            </Text>
          </VStack>
          {hasTwoFactor ? (
            <Text as="p" color="secondary">
              To preserve required protection, this account cannot disable its
              authenticator through the operations app.
            </Text>
          ) : (
            <TwoFactorEnrollmentForm enforced={twoFactorRequired} />
          )}
        </VStack>
      </Card>
    </VStack>
  );
}
