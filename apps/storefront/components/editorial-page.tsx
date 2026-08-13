import type { ReactNode } from "react";

export function EditorialPage({
  eyebrow,
  title,
  intro,
  children,
}: Readonly<{
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}>) {
  return (
    <section className="min-h-[80svh] bg-[var(--aura-ink)] px-5 pb-20 pt-28 text-[var(--aura-ivory)] sm:px-8 lg:px-10 lg:pb-28 lg:pt-32">
      <div className="mx-auto max-w-[82rem]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-text-muted-on-ink)]">{eyebrow}</p>
        <h1 data-motion-copy className="font-display mt-4 max-w-[11ch] text-[clamp(5rem,12vw,12rem)] leading-[0.74]">{title}</h1>
        <p className="mt-8 max-w-2xl text-base leading-7 text-[color:rgb(245_228_199_/_60%)]">{intro}</p>
        <div className="mt-14">{children}</div>
      </div>
    </section>
  );
}
