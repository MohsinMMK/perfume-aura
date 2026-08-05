import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@perfume-aura/ui/components/card";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { TwoFactorEnrollmentForm } from "@/components/auth/two-factor-enrollment-form";
import { isOpsTwoFactorRequired } from "@/lib/ops-security-policy";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Security · Perfume Aura Ops",
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Security
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your password, sessions, and required sign-in protection.
        </p>
      </div>

      {!twoFactorRequired || hasTwoFactor ? (
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Recovery links are single-use and expire after 30 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Authenticator app</CardTitle>
          <CardDescription>
            {hasTwoFactor
              ? "Two-factor authentication is active on this account."
              : twoFactorRequired
              ? "Two-factor authentication is required before you can access operations."
                : "Add an authenticator app and recovery codes to protect this account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasTwoFactor ? (
            <p className="text-sm text-muted-foreground">
              To preserve required protection, this account cannot disable its
              authenticator through the operations app.
            </p>
          ) : (
            <TwoFactorEnrollmentForm enforced={twoFactorRequired} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
