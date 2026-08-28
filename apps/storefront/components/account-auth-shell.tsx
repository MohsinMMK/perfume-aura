import Link from "next/link";
import type { ReactNode } from "react";

export function AccountAuthShell({
  title,
  description,
  supportingText,
  children,
  footer,
}: Readonly<{
  title: string;
  description: string;
  supportingText: string;
  children: ReactNode;
  footer: ReactNode;
}>) {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,28rem)] lg:gap-20">
      <div className="max-w-xl lg:pt-5">
        <Link
          href="/account"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--aura-text-muted-on-ivory)] underline-offset-4 hover:text-[var(--aura-ink)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ink)]"
        >
          Customer account
        </Link>
        <h1 className="mt-5 max-w-[12ch] text-balance font-display text-5xl leading-[0.92] tracking-[-0.02em] sm:text-6xl">
          {title}
        </h1>
        <p className="mt-5 max-w-[58ch] text-base leading-7 text-[var(--aura-text-muted-on-ivory)]">
          {description}
        </p>
        <p className="mt-7 max-w-[58ch] border-y border-black/15 py-4 text-sm leading-6 text-[var(--aura-ink)]">
          {supportingText}
        </p>
      </div>

      <div className="self-start border-t border-black/20 pt-7 lg:mt-2">
        {children}
        <div className="mt-7 border-t border-black/15 pt-5 text-sm leading-6 text-[var(--aura-text-muted-on-ivory)]">
          {footer}
        </div>
      </div>
    </div>
  );
}
