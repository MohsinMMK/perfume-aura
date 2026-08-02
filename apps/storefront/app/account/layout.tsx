import type { ReactNode } from "react";

export default function AccountLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <section className="min-h-[72svh] bg-[var(--aura-ivory)] px-5 pb-20 pt-28 text-[var(--aura-ink)] sm:px-8 lg:px-10 lg:pt-32"><div className="mx-auto max-w-4xl">{children}</div></section>;
}
