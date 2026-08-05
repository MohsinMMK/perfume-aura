import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@perfume-aura/ui/components/card";
import { TwoFactorChallengeForm } from "@/components/auth/two-factor-challenge-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Verify sign-in · Perfume Aura Ops",
  description: "Verify your Perfume Aura operations sign-in",
};

export default function TwoFactorPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify your sign-in</CardTitle>
        <CardDescription>
          Enter a code from your authenticator app or one unused recovery code.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TwoFactorChallengeForm />
      </CardContent>
    </Card>
  );
}
