import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = {
  title: "Forgot password · Perfume Aura Ops",
  description: "Request a secure owner password reset",
};

export default function ForgotPasswordPage() {
  return (
    <main className="w-full max-w-sm">
      <p className="text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Perfume Aura
      </p>
      <h1 className="mt-3 text-center font-heading text-2xl font-semibold tracking-tight">
        Reset owner password
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Request a single-use link sent through the configured owner mailbox.
      </p>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
