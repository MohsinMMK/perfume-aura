import type { ReactNode } from "react";

export default function AccountLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <section className="relative min-h-[100svh] bg-[var(--aura-ivory)] px-5 pb-20 pt-28 text-[var(--aura-ink)] sm:px-8 lg:px-12 lg:pb-28 lg:pt-32">
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-40 h-[5.5rem] bg-[var(--aura-ink)]" />
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}
