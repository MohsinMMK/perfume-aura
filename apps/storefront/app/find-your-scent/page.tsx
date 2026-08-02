import type { Metadata } from "next";
import { ScentFinder } from "@/components/scent-finder";

export const metadata: Metadata = { title: "Find your scent", alternates: { canonical: "/find-your-scent" } };

export default function FindYourScentPage() {
  return (
    <section className="min-h-[75svh] bg-[var(--aura-ivory)] px-5 pb-20 pt-28 text-[var(--aura-ink)] sm:px-8 lg:px-10 lg:pt-32">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#79633e]">Scent finder</p>
        <h1 className="font-display mt-3 max-w-[11ch] text-[clamp(5rem,11vw,11rem)] leading-[0.74]">Begin with a feeling.</h1>
        <p className="mt-6 max-w-2xl text-sm leading-6 text-[#5f584f]">
          A short path from mood to scent. The production matcher stays empty rather than guessing when approved fragrance data is incomplete.
        </p>
        <ScentFinder />
      </div>
    </section>
  );
}
