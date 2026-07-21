import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign in · Perfume Aura Ops",
  description: "Owner sign-in for Perfume Aura operations",
};

export default function LoginPage() {
  return (
    <main className="w-full max-w-sm">
      <p className="text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Perfume Aura
      </p>
      <h1 className="mt-3 text-center font-heading text-2xl font-semibold tracking-tight">
        Ops sign in
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Owner access only. Public registration is disabled.
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </main>
  );
}
