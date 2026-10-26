import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon, Location01Icon, WhatsappIcon } from "@hugeicons/core-free-icons";
import {
  perfumeAuraGoogleMapsUrl,
  perfumeAuraStoreAddress,
  perfumeAuraStoreName,
} from "@/lib/store-location";
import { whatsappContactUrl } from "@/lib/whatsapp-contact";

const visitSteps = [
  ["01", "Shortlist online", "Browse the Inspired and Signature Series and note the scents you want to try."],
  ["02", "Message the store", "Check current availability on WhatsApp before you travel."],
  ["03", "Test on skin", "Try your shortlist on paper and skin in Kondapur, then decide in your own time."],
] as const;

/**
 * Stylised, decorative map. It does not claim street accuracy; the Google
 * Maps listing owns directions.
 */
function StoreMapArt() {
  return (
    <svg viewBox="0 0 480 360" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <rect width="480" height="360" fill="var(--aura-elevated)" />
      <g stroke="var(--aura-rule)" strokeWidth="1" strokeDasharray="3 6">
        {[60, 120, 180, 240, 300].map((y) => <line key={`h${y}`} x1="0" x2="480" y1={y} y2={y} />)}
        {[80, 160, 240, 320, 400].map((x) => <line key={`v${x}`} x1={x} x2={x} y1="0" y2="360" />)}
      </g>
      <g fill="none" stroke="rgb(245 228 199 / 22%)" strokeLinecap="round">
        <path d="M-20 250 C 120 230, 180 120, 300 140 S 470 80, 520 40" strokeWidth="14" />
        <path d="M150 -20 C 170 90, 220 200, 210 380" strokeWidth="9" />
        <path d="M-20 90 L 520 210" strokeWidth="6" />
      </g>
      <path d="M-20 250 C 120 230, 180 120, 300 140 S 470 80, 520 40" fill="none" stroke="var(--aura-brass)" strokeWidth="1.5" strokeDasharray="8 8" />
      <circle cx="240" cy="160" r="64" fill="none" stroke="var(--aura-brass)" strokeOpacity="0.35" />
      <circle cx="240" cy="160" r="112" fill="none" stroke="var(--aura-brass)" strokeOpacity="0.18" />
    </svg>
  );
}

export function StoreVisitSection({ headingLevel = "h2" }: Readonly<{ headingLevel?: "h1" | "h2" }>) {
  const Heading = headingLevel;

  return (
    <section id="visit" aria-labelledby="store-visit-heading" className="scroll-mt-20 border-t border-dashed border-[color:var(--aura-rule)] bg-[var(--aura-ink)] px-[var(--aura-gutter)] py-20 text-[var(--aura-ivory)] lg:px-[var(--aura-gutter-lg)] lg:py-28">
      <div className="mx-auto max-w-[94rem]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aura-brass)]">Visit the Hyderabad store</p>
        <Heading id="store-visit-heading" data-motion-copy className="font-display mt-5 text-[clamp(4rem,9vw,9rem)] leading-[0.76]">
          Find the <span className="text-outline">Aura</span> in Kondapur
        </Heading>

        <div className="mt-12 grid gap-[var(--aura-gap)] lg:mt-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-[var(--aura-gap-lg)]">
          <a
            href={perfumeAuraGoogleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="group relative grid min-h-[22rem] overflow-hidden rounded-[var(--aura-radius)] border border-[color:var(--aura-rule)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ivory)] lg:min-h-[32rem]"
          >
            <StoreMapArt />
            <span className="relative grid place-items-center self-center justify-self-center" aria-hidden="true">
              <span className="absolute size-20 rounded-full bg-[var(--aura-brass)] opacity-30 motion-safe:animate-ping" />
              <span className="relative grid size-20 place-items-center rounded-full bg-[var(--aura-ivory)] text-[var(--aura-ink)] shadow-[0_1rem_2.5rem_rgb(0_0_0_/_45%)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1 motion-reduce:transition-none">
                <HugeiconsIcon icon={Location01Icon} strokeWidth={1.6} className="size-9" />
              </span>
              <span className="mt-3 rounded-full bg-[var(--aura-ink)] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em]">Kondapur</span>
            </span>
            <span className="relative flex min-h-16 items-center justify-between self-end bg-[var(--aura-ivory)] px-6 font-display text-xl text-[var(--aura-ink)] transition-colors group-hover:bg-[var(--aura-brass)]">
              Open in Google Maps
              <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={1.8} aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
              <span className="sr-only"> (opens in a new tab)</span>
            </span>
          </a>

          <div className="flex flex-col rounded-[var(--aura-radius)] border border-dashed border-[color:var(--aura-rule)] p-6 sm:p-10">
            <p className="font-display text-3xl leading-tight sm:text-4xl">{perfumeAuraStoreName}</p>
            <address className="mt-4 not-italic text-base leading-8 text-[color:rgb(245_228_199_/_68%)]">
              {perfumeAuraStoreAddress}
            </address>

            <ol className="mt-8 border-y border-dashed border-[color:var(--aura-rule)]">
              {visitSteps.map(([number, title, detail]) => (
                <li key={number} className="grid grid-cols-[3.5rem_1fr] gap-3 border-b border-dashed border-[color:var(--aura-rule)] py-5 last:border-b-0">
                  <span className="text-outline font-display text-4xl leading-none" aria-hidden="true">{number}</span>
                  <div>
                    <h3 className="font-display text-2xl leading-none">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[color:rgb(245_228_199_/_68%)]">{detail}</p>
                  </div>
                </li>
              ))}
            </ol>

            <a
              href={whatsappContactUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex min-h-14 items-center justify-between gap-4 rounded-[var(--aura-radius)] border border-[color:rgb(245_228_199_/_55%)] px-6 font-display text-xl transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ivory)]"
            >
              Message on WhatsApp
              <HugeiconsIcon icon={WhatsappIcon} strokeWidth={1.6} aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
