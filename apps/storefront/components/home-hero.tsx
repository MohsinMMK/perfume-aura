"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@perfume-aura/ui/components/button";

type HeroProduct = Readonly<{
  slug: string;
  name: string;
  image: string;
  imageAlt: string;
}>;

const fallbackProduct: HeroProduct = {
  slug: "",
  name: "The opening edit",
  image: "/images/hero-bottle-still-life.webp",
  imageAlt: "Perfume Aura black bottles on a polished stone plinth",
};

export function HomeHero({
  products,
}: Readonly<{ products: readonly HeroProduct[] }>) {
  const slides = products.length > 0 ? products : [fallbackProduct];
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const kickerRef = useRef<HTMLParagraphElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const activeProduct = slides[activeIndex] ?? fallbackProduct;
  const canRotate = slides.length > 1;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const section = sectionRef.current;
    const kicker = kickerRef.current;
    const heading = headingRef.current;
    const media = mediaRef.current;
    const controls = controlsRef.current;
    const cta = ctaRef.current;
    if (!section || !kicker || !heading || !media || !cta) return;
    let active = true;
    let cleanup = () => {};

    void import("gsap").then(({ default: gsap }) => {
      if (!active) return;
      const context = gsap.context(() => {
        const timeline = gsap.timeline({ defaults: { ease: "power4.out" } });
        timeline
          .from(kicker, { y: 18, opacity: 0, duration: 0.45 })
          .from(
            heading,
            {
              y: 80,
              clipPath: "inset(0 0 100% 0)",
              duration: 0.82,
            },
            0.08,
          )
          .from(
            media,
            { scale: 0.88, opacity: 0, duration: 0.85 },
            0.22,
          );
        if (controls) {
          timeline.from(
            controls,
            { scale: 0.8, opacity: 0, duration: 0.48 },
            0.5,
          );
        }
        timeline.from(
          cta,
          { y: 28, opacity: 0, duration: 0.5 },
          0.58,
        );
      }, section);
      cleanup = () => context.revert();
    });

    return () => {
      active = false;
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const section = sectionRef.current;
    const image = imageRef.current;
    const name = nameRef.current;
    if (!section || !image || !name) return;
    let active = true;
    let cleanup = () => {};

    void import("gsap").then(({ default: gsap }) => {
      if (!active) return;
      const context = gsap.context(() => {
        gsap.fromTo(
          image,
          { y: 34, scale: 1.06, opacity: 0.2, filter: "blur(9px)" },
          {
            y: 0,
            scale: 1,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.72,
            ease: "power4.out",
          },
        );
        gsap.fromTo(
          name,
          { y: 12, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.38, ease: "power4.out" },
        );
        gsap.to(image, {
          y: -10,
          duration: 2.8,
          delay: 0.72,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }, section);
      cleanup = () => context.revert();
    });

    return () => {
      active = false;
      cleanup();
    };
  }, [activeIndex]);

  function rotate(direction: -1 | 1) {
    setActiveIndex((currentIndex) =>
      (currentIndex + direction + slides.length) % slides.length,
    );
  }

  return (
    <section ref={sectionRef} className="relative min-h-[100svh] overflow-hidden bg-[var(--aura-ink)] text-[var(--aura-ivory)]">
      <div className="relative mx-auto min-h-[100svh] max-w-[100rem] px-3 pb-8 pt-24 sm:px-5 lg:px-6 lg:pt-20">
        <div className="relative z-20 mx-auto max-w-[72rem] text-center">
          <p ref={kickerRef} className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[color:rgb(245_228_199_/_62%)]">
            Product no. 0{activeIndex + 1} · Perfume Aura India
          </p>
          <h1 ref={headingRef} className="font-display mx-auto mt-3 max-w-[12ch] text-[clamp(4rem,8vw,7.5rem)] leading-[0.77] tracking-[-0.035em]">
            The scent <span className="text-outline">that leaves an aura behind</span>
          </h1>
        </div>

        <div className="absolute inset-x-0 bottom-[6.8rem] top-[15rem] sm:top-[16rem] lg:bottom-0 lg:top-[14.5rem]">
          <div className="absolute inset-x-0 top-3 z-20 flex items-center" aria-live="polite">
            <span className="h-px flex-1 border-t border-dashed border-white/20" />
            <span ref={nameRef} data-testid="hero-scent-name" className="font-display px-4 text-lg tracking-[0.04em] text-white/88 sm:px-7">
              {activeProduct.name}
            </span>
            <span className="h-px flex-1 border-t border-dashed border-white/20" />
          </div>

          <div ref={mediaRef} className="absolute inset-x-0 bottom-0 top-10 mx-auto max-w-[47rem] overflow-hidden">
            <Image
              ref={imageRef}
              key={activeProduct.image}
              src={activeProduct.image}
              alt={activeProduct.imageAlt}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 46rem"
              className="object-cover object-center lg:object-contain"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,12,11,.18)_0%,transparent_20%,transparent_72%,rgba(13,12,11,.82)_100%)]" />
          </div>

          {canRotate ? (
            <div ref={controlsRef} className="absolute inset-x-4 top-[52%] z-30 flex -translate-y-1/2 justify-between sm:inset-x-8 lg:inset-x-14">
              <button
                type="button"
                className="grid min-h-14 min-w-14 place-items-center rounded-full bg-[var(--aura-ivory)] text-[var(--aura-ink)] transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ivory)] lg:min-h-20 lg:min-w-20"
                aria-label="Show previous featured scent"
                onClick={() => rotate(-1)}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                className="grid min-h-14 min-w-14 place-items-center rounded-full bg-[var(--aura-ivory)] text-[var(--aura-ink)] transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ivory)] lg:min-h-20 lg:min-w-20"
                aria-label="Show next featured scent"
                onClick={() => rotate(1)}
              >
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.8} />
              </button>
            </div>
          ) : null}
        </div>

        <div ref={ctaRef} className="absolute inset-x-5 bottom-5 z-30 flex justify-center sm:inset-x-8 lg:bottom-6">
          <Button
            render={<Link href={activeProduct.slug ? `/products/${activeProduct.slug}` : "/shop"} />}
            nativeButton={false}
            size="lg"
            className="min-h-16 w-full max-w-sm rounded-[0.65rem] bg-[var(--aura-ivory)] px-8 font-display text-xl tracking-[0.02em] text-[var(--aura-ink)] hover:bg-white"
          >
            {activeProduct.slug ? `Explore ${activeProduct.name}` : "Explore the collection"}
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.8} />
          </Button>
        </div>
      </div>
    </section>
  );
}
