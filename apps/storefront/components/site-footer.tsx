import Image from "next/image";
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
    <footer className="bg-[var(--aura-ink)] px-2 pb-4 pt-2 text-[var(--aura-ivory)]">
      <div className="grid w-full gap-3 lg:grid-cols-[18rem_14rem_1fr_7rem]">
        <div className="grid min-h-44 place-items-center rounded-[var(--aura-radius)] border border-dashed border-[color:var(--aura-rule)] p-5 text-center">
          <Link href="/" aria-label="Perfume Aura home" className="grid place-items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ivory)]">
            <Image src="/brand/perfume-aura-icon.svg" alt="" aria-hidden="true" width={271} height={386} className="h-auto w-20 select-none sm:w-24" />
            <Image src="/brand/perfume-aura-wordmark.svg" alt="" aria-hidden="true" width={422} height={34} className="h-auto w-40 select-none sm:w-44" />
          </Link>
        </div>

        <nav aria-label="Footer navigation" className="grid content-center">
          <div className="border-y border-dashed border-[color:var(--aura-rule)]">
            {navigation.map(([label, href]) => (
              <Link key={href} href={href} prefetch={false} className="group flex min-h-12 items-center border-b border-dashed border-[color:var(--aura-rule)] font-display text-lg text-[var(--aura-ivory)] transition-colors last:border-b-0 hover:text-[var(--aura-ivory)] focus-visible:text-[var(--aura-ivory)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ivory)]">
                <span aria-hidden="true" className="mr-0 w-0 overflow-hidden opacity-0 transition-[width,margin,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:mr-3 group-hover:w-3 group-hover:opacity-100 group-focus-visible:mr-3 group-focus-visible:w-3 group-focus-visible:opacity-100 motion-reduce:transition-none">
                  <span className="block size-3 bg-current [clip-path:polygon(12%_0,100%_50%,12%_100%)]" />
                </span>
                <span className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </nav>

        <div data-footer-aura-list>
          <h2 className="font-display text-3xl">Join the Aura list</h2>
          <p className="mt-2 text-xs leading-5 text-[color:rgb(245_228_199_/_65%)]">
            New compositions, launch notes, and the first word when the collection opens.
          </p>
          <div className="mt-6 flex min-h-14 items-center border-y border-dashed border-[color:var(--aura-rule)] px-1 text-xs text-[color:rgb(245_228_199_/_68%)]" aria-label="Aura list opening soon">
            House dispatch
            <span className="ml-auto font-semibold uppercase tracking-[0.12em]">Opening soon</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          <Link href="/account" prefetch={false} className="grid min-h-24 place-items-center rounded-[var(--aura-radius)] border border-[color:rgb(245_228_199_/_55%)] font-display text-lg hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ivory)]">Account</Link>
          <Link href="/search" prefetch={false} className="grid min-h-24 place-items-center rounded-[var(--aura-radius)] border border-[color:rgb(245_228_199_/_55%)] font-display text-lg hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ivory)]">Search</Link>
        </div>
      </div>

      <div className="mt-3 flex w-full flex-col gap-3 border-t border-dashed border-[color:var(--aura-rule)] px-[var(--aura-gutter)] pt-3 text-[0.62rem] uppercase tracking-[0.08em] text-[color:rgb(245_228_199_/_65%)] sm:flex-row sm:items-center sm:justify-between lg:px-[var(--aura-gutter-lg)]">
        <p>© {new Date().getFullYear()} Perfume Aura. All rights reserved.</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {policies.map(([label, href]) => <Link key={href} href={href} prefetch={false} className="inline-flex min-h-11 items-center hover:text-[var(--aura-ivory)]">{label}</Link>)}
        </div>
      </div>
    </footer>
  );
}
