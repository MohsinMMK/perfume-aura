"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@perfume-aura/ui/components/button";
import { perfumeAuraGoogleMapsListingUrl } from "@/lib/store-location";
import { storeReviewSummary, storeReviews } from "@/lib/store-reviews";

const reviewTitle = "Reviews";

const tileThemes = [
  { background: "var(--aura-brass)", color: "var(--aura-ink)" },
  { background: "var(--aura-orange)", color: "var(--aura-ink)" },
  { background: "var(--aura-elevated)", color: "var(--aura-ivory)" },
  { background: "var(--aura-ivory)", color: "var(--aura-ink)" },
  { background: "var(--aura-card-inspired)", color: "var(--aura-ivory)" },
] as const;

const arrowClassName =
  "grid size-12 shrink-0 place-items-center rounded-full border border-[color:rgb(245_228_199_/_55%)] transition-colors hover:bg-[var(--aura-ivory)] hover:text-[var(--aura-ink)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ivory)] aria-disabled:pointer-events-none aria-disabled:opacity-30 sm:size-14";

export function HomeReviews() {
  const trackRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });

  const syncEdges = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setEdges({
      atStart: track.scrollLeft <= 4,
      atEnd: track.scrollLeft + track.clientWidth >= track.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    syncEdges();
    track.addEventListener("scroll", syncEdges, { passive: true });
    window.addEventListener("resize", syncEdges);
    return () => {
      track.removeEventListener("scroll", syncEdges);
      window.removeEventListener("resize", syncEdges);
    };
  }, [syncEdges]);

  const step = (direction: 1 | -1) => {
    if (direction === 1 ? edges.atEnd : edges.atStart) return;
    const track = trackRef.current;
    const card = track?.firstElementChild;
    if (!track || !(card instanceof HTMLElement)) return;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Step from the nearest card, so quick repeat presses each move one card.
    const stepWidth = card.offsetWidth + gap;
    track.scrollTo({
      left: (Math.round(track.scrollLeft / stepWidth) + direction) * stepWidth,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <section aria-labelledby="home-reviews-heading" className="overflow-hidden bg-[var(--aura-ink)] py-20 text-[var(--aura-ivory)] lg:py-28">
      <div data-motion-letters className="px-[var(--aura-gutter)] lg:px-[var(--aura-gutter-lg)]">
        <h2 id="home-reviews-heading" className="font-display text-outline whitespace-nowrap text-center text-[clamp(4.5rem,21vw,24rem)] leading-[0.78]">
          <span className="sr-only">{reviewTitle}</span>
          <span aria-hidden="true" className="inline-flex">
            {Array.from(reviewTitle).map((letter, index) => (
              <span key={`${letter}-${index}`} data-motion-letter className="inline-block">
                {letter}
              </span>
            ))}
          </span>
        </h2>
      </div>

      <div className="mx-auto mt-10 flex max-w-[94rem] flex-wrap items-center justify-between gap-4 px-[var(--aura-gutter)] lg:mt-14 lg:px-[var(--aura-gutter-lg)]">
        <a
          href={perfumeAuraGoogleMapsListingUrl}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex min-h-12 items-center gap-3 rounded-full border border-dashed border-[color:var(--aura-rule)] px-5 text-sm transition-colors hover:border-[color:var(--aura-brass)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ivory)]"
        >
          <span className="flex text-[var(--aura-brass)]" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <HugeiconsIcon key={index} icon={StarIcon} strokeWidth={1.6} className="size-4 fill-current" />
            ))}
          </span>
          <span className="font-display text-lg leading-none">{storeReviewSummary.rating}</span>
          <span className="text-[var(--aura-text-muted-on-ink)]">
            {storeReviewSummary.count} Google reviews
            <span className="sr-only">, rated {storeReviewSummary.rating} out of 5 as of {storeReviewSummary.checkedOn}. Open the store on Google Maps (opens in a new tab)</span>
          </span>
          <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={1.8} aria-hidden="true" className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </a>
        <div className="flex gap-3">
          <button type="button" aria-label="Previous review" aria-controls="home-reviews-track" aria-disabled={edges.atStart} onClick={() => step(-1)} className={arrowClassName}>
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={1.8} aria-hidden="true" className="size-6" />
          </button>
          <button type="button" aria-label="Next review" aria-controls="home-reviews-track" aria-disabled={edges.atEnd} onClick={() => step(1)} className={arrowClassName}>
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.8} aria-hidden="true" className="size-6" />
          </button>
        </div>
      </div>

      <div data-motion-track className="mx-auto mt-6 max-w-[94rem] px-[var(--aura-gutter)] lg:px-[var(--aura-gutter-lg)]">
        {/* Layout containment keeps the off-screen cards from widening the
            phone layout viewport, which Chrome otherwise grows to fit them. */}
        <ul
          ref={trackRef}
          id="home-reviews-track"
          tabIndex={0}
          aria-label="Google Maps reviews"
          className="shop-listing-rail flex snap-x [contain:layout] snap-mandatory gap-[var(--aura-gap)] overflow-x-auto pb-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ivory)] lg:gap-[var(--aura-gap-lg)]"
        >
          {storeReviews.map((review, index) => {
            const theme = tileThemes[index % tileThemes.length];
            return (
              <li
                key={review.quote}
                className="flex w-[86%] shrink-0 snap-start flex-col gap-2 sm:w-[calc((100%-var(--aura-gap))/2)] lg:w-[calc((100%-2*var(--aura-gap-lg))/3)]"
              >
                <p className="flex min-h-16 items-center justify-between rounded-[var(--aura-radius)] bg-[var(--aura-ivory)] px-5 font-display text-xl uppercase tracking-[0.04em] text-[var(--aura-ink)] lg:min-h-20 lg:text-2xl">
                  <span className="aura-stack__dot" aria-hidden="true" />
                  {review.author}
                  <span className="aura-stack__dot" aria-hidden="true" />
                </p>
                <figure className="flex min-h-[24rem] flex-1 flex-col rounded-[var(--aura-radius)] p-6 sm:p-8 lg:min-h-[30rem]" style={theme}>
                  <span className="flex gap-1" aria-hidden="true">
                    {Array.from({ length: 5 }, (_, star) => (
                      <HugeiconsIcon key={star} icon={StarIcon} strokeWidth={1.6} className="size-5 fill-current" />
                    ))}
                  </span>
                  <span className="sr-only">Rated 5 out of 5.</span>
                  <blockquote cite={perfumeAuraGoogleMapsListingUrl} className="mt-auto pt-10">
                    <p className="font-display text-[clamp(1.75rem,2.6vw,2.6rem)] leading-[1.02] text-balance">“{review.quote}”</p>
                  </blockquote>
                  <figcaption className="mt-8 border-t border-dashed border-current pt-4 text-xs font-semibold uppercase tracking-[0.18em] opacity-80">
                    Google Maps review
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-14 text-center">
        <Button
          render={<Link href="/fragrance-guide" />}
          nativeButton={false}
          size="lg"
          className="aura-cream-action min-h-16 w-[calc(100%-2rem)] max-w-sm justify-between rounded-[var(--aura-radius)] px-8 font-display text-xl tracking-[0.02em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ivory)]"
        >
          Learn how to choose a scent
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.8} aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
