import { ResetPasswordForm } from "./reset-password-form";

export const metadata = {
  title: "Reset password · Perfume Aura Ops",
  description: "Set a new owner password",
};

export default function ResetPasswordPage() {
  return (
    <main className="w-full max-w-sm">
      <p className="text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Perfume Aura
      </p>
      <h1 className="mt-3 text-center font-heading text-2xl font-semibold tracking-tight">
        Choose a new password
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Reset links are single-use and expire after 30 minutes.
      </p>
      <div className="mt-8">
        <ResetPasswordForm />
      </div>
    </main>
  );
}
