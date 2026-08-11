import Link from "next/link";

const navigation = [
  ["Shop", "/shop"],
  ["Wholesale", "/wholesale"],
  ["About", "/about"],
  ["FAQ", "/faq"],
  ["Contact", "/contact"],
] as const;

const policies = [
  ["Shipping", "/shipping"],
  ["Returns", "/returns"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-dashed border-[color:rgb(245_228_199_/_25%)] bg-[var(--aura-ink)] px-3 pb-4 pt-3 text-[var(--aura-ivory)] sm:px-5">
      <div className="mx-auto grid max-w-[94rem] border border-[color:rgb(245_228_199_/_24%)] lg:grid-cols-[18rem_14rem_1fr_7rem]">
        <div className="grid min-h-52 place-items-center border-b border-[color:rgb(245_228_199_/_24%)] p-7 text-center lg:border-b-0 lg:border-r">
          <div>
            <p className="font-[var(--font-playfair)] text-3xl leading-none tracking-[0.06em]">PERFUME</p>
            <p className="font-display text-5xl leading-none">AURA</p>
            <p className="mt-3 text-[0.62rem] uppercase tracking-[0.2em] text-[color:rgb(245_228_199_/_55%)]">India · in progress</p>
          </div>
        </div>

        <nav aria-label="Footer navigation" className="grid content-center border-b border-[color:rgb(245_228_199_/_24%)] p-6 lg:border-b-0 lg:border-r">
          {navigation.map(([label, href]) => (
            <Link key={href} href={href} prefetch={false} className="flex min-h-8 items-center font-display text-base hover:text-white">
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-b border-[color:rgb(245_228_199_/_24%)] p-6 lg:border-b-0 lg:border-r lg:p-8">
          <h2 className="font-display text-3xl">Join the Aura list</h2>
          <p className="mt-2 text-xs leading-5 text-[color:rgb(245_228_199_/_52%)]">
            New scents, restocks, and launch notes. Signup opens after consent copy and email delivery are approved.
          </p>
          <div className="mt-6 flex min-h-14 items-center rounded-[0.6rem] border border-[color:rgb(245_228_199_/_24%)] px-4 text-xs text-[color:rgb(245_228_199_/_45%)]" aria-label="Newsletter signup unavailable pending approval">
            Your email…
            <span className="ml-auto text-xl" aria-hidden="true">→</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-1">
          <Link href="/account" prefetch={false} className="grid min-h-24 place-items-center border-r border-[color:rgb(245_228_199_/_24%)] font-display text-lg hover:bg-white/5 lg:border-b lg:border-r-0">Account</Link>
          <Link href="/search" prefetch={false} className="grid min-h-24 place-items-center font-display text-lg hover:bg-white/5">Search</Link>
        </div>
      </div>

      <div className="mx-auto mt-3 flex max-w-[94rem] flex-col gap-3 text-[0.62rem] uppercase tracking-[0.08em] text-[color:rgb(245_228_199_/_45%)] sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Perfume Aura. All rights reserved.</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {policies.map(([label, href]) => <Link key={href} href={href} prefetch={false} className="hover:text-[var(--aura-ivory)]">{label}</Link>)}
        </div>
      </div>
    </footer>
  );
}
