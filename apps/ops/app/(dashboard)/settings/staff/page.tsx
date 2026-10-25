import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { DeactivateStaffButton } from "@/components/auth/deactivate-staff-button";
import { StaffInviteForm } from "@/components/auth/staff-invite-form";
import { PageHeader } from "@/components/page-header";
import { areOpsStaffInvitesEnabled } from "@/lib/ops-security-policy";
import { requireCapability } from "@/lib/session";
import { listStaffAccounts } from "@/lib/staff-operations";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Staff access",
  description: "Owner-only staff access management",
};

export default async function StaffAccessPage() {
  await requireCapability("security.staff.manage", { redirectToLogin: true });
  const [staffAccounts, invitesEnabled] = await Promise.all([
    listStaffAccounts(),
    areOpsStaffInvitesEnabled(),
  ]);

  return (
    <VStack gap={6} className="mx-auto w-full max-w-4xl">
      <PageHeader
        title="Staff access"
        description="Staff identities are invite-only, protected by two-factor enrollment, and retained as an auditable record when deactivated."
      />

      <Card padding={6}>
        <VStack gap={5}>
          <VStack gap={1}>
            <Heading level={2}>Invite staff</Heading>
            <Text as="p" color="secondary">
              {invitesEnabled
                ? "The recipient receives an expiring link to set their own password."
                : "Release gate: invitations remain disabled until SMTP delivery and owner recovery are proven."}
            </Text>
          </VStack>
          <StaffInviteForm enabled={invitesEnabled} />
        </VStack>
      </Card>

      <Card padding={6}>
        <VStack gap={5}>
          <VStack gap={1}>
            <Heading level={2}>Staff accounts</Heading>
            <Text as="p" color="secondary">
              Deactivation bans the staff identity and revokes sessions; it
              never deletes operational or audit data.
            </Text>
          </VStack>
          {staffAccounts.length === 0 ? (
            <Text as="p" color="secondary">
              No staff accounts yet.
            </Text>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {staffAccounts.map((staff) => (
                <li
                  key={staff.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <VStack gap={1} align="start">
                    <Text as="p" weight="semibold">
                      {staff.name}
                    </Text>
                    <Text as="p" color="secondary">
                      {staff.email}
                    </Text>
                    <Token
                      size="sm"
                      color={
                        staff.banned
                          ? "gray"
                          : staff.emailVerified
                            ? "green"
                            : "orange"
                      }
                      label={
                        staff.banned
                          ? "Deactivated"
                          : staff.emailVerified
                            ? "Active"
                            : "Pending password setup"
                      }
                    />
                  </VStack>
                  {staff.banned ? null : (
                    <DeactivateStaffButton staffUserId={staff.id} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </VStack>
      </Card>
    </VStack>
  );
}
