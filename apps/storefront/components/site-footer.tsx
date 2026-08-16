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
    <footer className="border-t border-dashed border-[color:var(--aura-rule)] bg-[var(--aura-ink)] px-[var(--aura-gutter)] pb-4 pt-[var(--aura-gutter)] text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)]">
      <div className="mx-auto grid max-w-[94rem] border border-[color:var(--aura-rule)] lg:grid-cols-[18rem_14rem_1fr_7rem]">
        <div className="grid min-h-52 place-items-center border-b border-[color:var(--aura-rule)] p-7 text-center lg:border-b-0 lg:border-r">
          <div>
            <p className="font-display text-3xl leading-none tracking-[0.06em]">PERFUME</p>
            <p className="font-display text-5xl leading-none">AURA</p>
            <p className="mt-3 text-[0.62rem] uppercase tracking-[0.2em] text-[color:rgb(245_228_199_/_65%)]">India · composed for presence</p>
          </div>
        </div>

        <nav aria-label="Footer navigation" className="grid content-center border-b border-[color:var(--aura-rule)] p-6 lg:border-b-0 lg:border-r">
          {navigation.map(([label, href]) => (
            <Link key={href} href={href} prefetch={false} className="flex min-h-11 items-center font-display text-base hover:text-white">
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-b border-[color:var(--aura-rule)] p-6 lg:border-b-0 lg:border-r lg:p-8">
          <h2 className="font-display text-3xl">Join the Aura list</h2>
          <p className="mt-2 text-xs leading-5 text-[color:rgb(245_228_199_/_65%)]">
            New compositions, launch notes, and the first word when the collection opens.
          </p>
          <div className="mt-6 flex min-h-14 items-center border-y border-dashed border-[color:var(--aura-rule)] px-1 text-xs text-[color:rgb(245_228_199_/_68%)]" aria-label="Aura list opening soon">
            House dispatch
            <span className="ml-auto font-semibold uppercase tracking-[0.12em]">Opening soon</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-1">
          <Link href="/account" prefetch={false} className="grid min-h-24 place-items-center border-r border-[color:var(--aura-rule)] font-display text-lg hover:bg-white/5 lg:border-b lg:border-r-0">Account</Link>
          <Link href="/search" prefetch={false} className="grid min-h-24 place-items-center font-display text-lg hover:bg-white/5">Search</Link>
        </div>
      </div>

      <div className="mx-auto mt-3 flex max-w-[94rem] flex-col gap-3 text-[0.62rem] uppercase tracking-[0.08em] text-[color:rgb(245_228_199_/_65%)] sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Perfume Aura. All rights reserved.</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {policies.map(([label, href]) => <Link key={href} href={href} prefetch={false} className="inline-flex min-h-11 items-center hover:text-[var(--aura-ivory)]">{label}</Link>)}
        </div>
      </div>
    </footer>
  );
}
