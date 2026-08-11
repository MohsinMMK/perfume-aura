import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@perfume-aura/ui/components/card";
import { DeactivateStaffButton } from "@/components/auth/deactivate-staff-button";
import { StaffInviteForm } from "@/components/auth/staff-invite-form";
import { areOpsStaffInvitesEnabled } from "@/lib/ops-security-policy";
import { requireCapability } from "@/lib/session";
import { listStaffAccounts } from "@/lib/staff-operations";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Staff access · Perfume Aura Ops",
  description: "Owner-only staff access management",
};

export default async function StaffAccessPage() {
  await requireCapability("security.staff.manage", { redirectToLogin: true });
  const [staffAccounts, invitesEnabled] = await Promise.all([
    listStaffAccounts(),
    areOpsStaffInvitesEnabled(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Staff access
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Staff identities are invite-only, protected by two-factor enrollment,
          and retained as an auditable record when deactivated.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite staff</CardTitle>
          <CardDescription>
            {invitesEnabled
              ? "The recipient receives an expiring link to set their own password."
              : "Release gate: invitations remain disabled until SMTP delivery and owner recovery are proven."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StaffInviteForm enabled={invitesEnabled} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staff accounts</CardTitle>
          <CardDescription>
            Deactivation bans the staff identity and revokes sessions; it never
            deletes operational or audit data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {staffAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff accounts yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {staffAccounts.map((staff) => (
                <li
                  key={staff.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{staff.name}</p>
                    <p className="text-sm text-muted-foreground">{staff.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {staff.banned
                        ? "Deactivated"
                        : staff.emailVerified
                          ? "Active"
                          : "Pending password setup"}
                    </p>
                  </div>
                  {staff.banned ? null : (
                    <DeactivateStaffButton staffUserId={staff.id} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
