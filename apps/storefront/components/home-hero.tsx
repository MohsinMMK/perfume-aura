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
import { attachContinuousMotionGuard } from "@/lib/continuous-motion";

type HeroProduct = Readonly<{
  slug: string;
  name: string;
  image: string;
  imageAlt: string;
  floating?: boolean;
}>;

const fallbackProduct: HeroProduct = {
  slug: "",
  name: "Perfume Aura Elixir",
  image: "/images/perfume-aura-100ml-floating-clean.webp",
  imageAlt: "Perfume Aura matte black 100 ml bottle with gold details",
  floating: true,
};

const fallbackSlides: readonly HeroProduct[] = [
  fallbackProduct,
  {
    slug: "",
    name: "Tidal composition",
    image: "/images/azure-tides-50ml.webp",
    imageAlt: "Perfume Aura black bottle arranged with sculpted blue glass",
  },
  {
    slug: "",
    name: "Petal composition",
    image: "/images/petalia-noir-50ml.webp",
    imageAlt: "Perfume Aura black bottle arranged with a soft rose glass form",
  },
];

export function HomeHero({
  products,
}: Readonly<{ products: readonly HeroProduct[] }>) {
  const slides = products.length > 0 ? [fallbackProduct, ...products] : fallbackSlides;
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const activeProduct = slides[activeIndex] ?? fallbackProduct;
  const canRotate = slides.length > 1;

  useEffect(() => {
    const section = sectionRef.current;
    const heading = headingRef.current;
    const media = mediaRef.current;
    const controls = controlsRef.current;
    const cta = ctaRef.current;
    if (!section || !heading || !media || !cta) return;
    let active = true;
    let cleanup = () => {};

    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([{ default: gsap }, { ScrollTrigger }]) => {
        if (!active) return;
        gsap.registerPlugin(ScrollTrigger);
        const motionMedia = gsap.matchMedia(section);

        motionMedia.add("(prefers-reduced-motion: no-preference)", () => {
          const timeline = gsap.timeline({ defaults: { ease: "power4.out" } });
          timeline
            .from(heading, { y: 56, duration: 0.78 }, 0.08)
            .from(media, { y: 28, scale: 0.94, duration: 0.82 }, 0.18);
          if (controls) {
            timeline.from(controls, { scale: 0.86, duration: 0.42 }, 0.48);
          }
          timeline.from(cta, { y: 20, duration: 0.46 }, 0.56);

          gsap.to(heading, {
            y: -28,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: "bottom top",
              scrub: 0.4,
            },
          });
        });

        cleanup = () => motionMedia.revert();
      },
    );

    return () => {
      active = false;
      cleanup();
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const image = imageRef.current;
    const name = nameRef.current;
    if (!section || !image || !name) return;
    let active = true;
    let cleanup = () => {};

    void import("gsap").then(({ default: gsap }) => {
      if (!active) return;
      const motionMedia = gsap.matchMedia(section);

      motionMedia.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          image,
          { y: 28, scale: 1.04, opacity: 0.35 },
          {
            y: 0,
            scale: 1,
            opacity: 1,
            duration: 0.72,
            ease: "power4.out",
          },
        );
        gsap.fromTo(
          name,
          { y: 12 },
          { y: 0, duration: 0.38, ease: "power4.out" },
        );
        if (activeProduct.floating) return;

        const pulse = gsap.to(image, {
          y: -10,
          duration: 2,
          delay: 0.72,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        return attachContinuousMotionGuard(section, pulse);
      });

      cleanup = () => motionMedia.revert();
    });

    return () => {
      active = false;
      cleanup();
    };
  }, [activeIndex, activeProduct.floating]);

  function rotate(direction: -1 | 1) {
    setActiveIndex((currentIndex) =>
      (currentIndex + direction + slides.length) % slides.length,
    );
  }

  return (
    <section ref={sectionRef} className="aura-hero relative min-h-[100svh] overflow-hidden bg-[var(--aura-ink)] text-[var(--aura-ivory)]">
      <div
        className="pointer-events-none absolute left-1/2 top-[46%] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[var(--aura-brass)] opacity-[0.08] blur-[90px]"
        aria-hidden="true"
      />
      <div className="relative mx-auto grid min-h-[100svh] max-w-[100rem] grid-rows-[auto_1fr] px-[var(--aura-gutter)] pb-[var(--aura-gutter)] pt-28 lg:px-[var(--aura-gutter-lg)] lg:pb-8 lg:pt-20">
        <div className="relative z-20 mx-auto max-w-[72rem] text-center">
          <h1 ref={headingRef} className="font-display mx-auto max-w-[12ch] text-[clamp(3.25rem,6.9444vw,8.3333rem)] leading-[0.88] tracking-[-0.02em] text-balance lg:leading-[0.84]">
            The scent <span className="text-outline">that leaves an aura</span>
          </h1>
        </div>

        <div className="relative mt-4 min-h-[27rem] sm:min-h-[34rem] lg:mt-3 lg:min-h-0">
          <div className="absolute inset-x-0 top-24 z-20 flex items-center gap-3" aria-live="polite">
            <span className="hidden pl-2 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[color:rgb(245_228_199_/_60%)] sm:block">
              Product no. 0{activeIndex + 1}
            </span>
            <span className="h-px flex-1 border-t border-dashed border-white/20" />
            <span ref={nameRef} data-testid="hero-scent-name" className="font-display pr-2 text-lg tracking-[0.04em] text-white/88 sm:pl-4">
              {activeProduct.name}
            </span>
          </div>

          <div ref={mediaRef} className="absolute inset-x-0 bottom-10 top-12 mx-auto max-w-[47rem] overflow-hidden lg:bottom-0">
            <Image
              ref={imageRef}
              key={activeProduct.image}
              src={activeProduct.image}
              alt={activeProduct.imageAlt}
              fill
              preload
              sizes="(max-width: 768px) 100vw, 46rem"
              className={`z-10 object-contain object-center ${activeProduct.floating ? "aura-hero-bottle-float scale-[.88] drop-shadow-[0_1.4rem_1.2rem_rgba(0,0,0,.34)] sm:scale-[.92]" : ""}`}
            />
            {activeProduct.floating ? null : (
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,11,6,.1)_0%,transparent_18%,transparent_70%,rgba(16,11,6,.78)_100%)]" />
            )}
          </div>

          {canRotate ? (
            <div ref={controlsRef} className="absolute inset-x-2 top-[58%] z-30 flex -translate-y-1/2 justify-between sm:inset-x-8 lg:inset-x-14 lg:top-[52%]">
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

        <div ref={ctaRef} className="absolute inset-x-3 bottom-3 z-30 flex justify-center sm:inset-x-8 lg:bottom-6">
          <Button
            render={<Link href={activeProduct.slug ? `/products/${activeProduct.slug}` : "/shop"} />}
            nativeButton={false}
            size="lg"
            aria-label={activeProduct.slug ? `Shop now: ${activeProduct.name}` : "Shop the collection"}
            className="min-h-16 w-full max-w-xs rounded-[var(--aura-radius)] bg-[var(--aura-ivory)] px-8 font-display text-xl tracking-[0.02em] text-[var(--aura-ink)] hover:bg-white"
          >
            Shop now
          </Button>
        </div>
      </div>
    </section>
  );
}
