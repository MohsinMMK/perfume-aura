import Link from "next/link";
import { Button } from "@perfume-aura/ui/components/button";

export default function NotFound() {
  return <section className="grid min-h-[100svh] place-items-center bg-[var(--aura-ink)] px-5 py-24 text-center text-[var(--aura-ivory)]"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--aura-brass)]">404 · Lost note</p><h1 className="font-display mt-5 text-8xl sm:text-[11rem]">The trail faded.</h1><p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-white/60">This page does not exist, or the product is not available yet.</p><Button render={<Link href="/" />} nativeButton={false} className="mt-8 min-h-14 rounded-[0.6rem] bg-[var(--aura-ivory)] px-8 font-display text-xl text-[var(--aura-ink)] hover:bg-white">Return home</Button></div></section>;
}
