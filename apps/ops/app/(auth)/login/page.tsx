import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign in · Perfume Aura Ops",
  description: "Owner and staff sign-in for Perfume Aura operations",
};

export default function LoginPage() {
  return (
    <main className="w-full max-w-[28rem]">
      <section className="w-full rounded-xl border border-border bg-card p-6 text-card-foreground sm:p-8">
        <p className="text-sm font-semibold text-muted-foreground">Perfume Aura Operations</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Sign in to operations
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Private access for the owner and invited staff. Customer accounts are managed separately on the storefront.
        </p>
        <div className="mt-7">
          <LoginForm />
        </div>
      </section>
      <p className="mt-8 text-center">
        <Link
          href="https://perfumeaura.com"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Return to the customer storefront
        </Link>
      </p>
    </main>
  );
}
