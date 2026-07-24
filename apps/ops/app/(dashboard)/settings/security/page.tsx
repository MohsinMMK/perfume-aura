import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@perfume-aura/ui/components/card";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { requireOwnerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Security · Perfume Aura Ops",
  description: "Owner account security settings",
};

export default async function SecuritySettingsPage() {
  await requireOwnerSession({ redirectToLogin: true });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Security
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Change the owner password and revoke other active sessions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Owner password</CardTitle>
          <CardDescription>
            Recovery links are single-use and expire after 30 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
