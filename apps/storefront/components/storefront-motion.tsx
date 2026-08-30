"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { attachContinuousMotionGuard } from "@/lib/continuous-motion";
import { compactHeaderScrollY } from "@/lib/header-motion";

const historyScrollStateKey = "__perfumeAuraScroll";
const mobileProductCardQuery = "(max-width: 639px)";
const mobileProductCardRevealRootMargin = "-49% 0px -49% 0px";
const mobileProductCardRevealThreshold = 0;

type HistoryScrollPosition = Readonly<{
  x: number;
  y: number;
}>;

function groupElementsByOffsetTop(
  elements: readonly HTMLElement[],
): HTMLElement[][] {
  const rows = new Map<number, HTMLElement[]>();

  elements.forEach((element) => {
    const rowTop = Math.round(element.offsetTop);
    const row = rows.get(rowTop);
    if (row) row.push(element);
    else rows.set(rowTop, [element]);
  });

  return Array.from(rows.values());
}

function readHistoryScrollPosition(state: unknown): HistoryScrollPosition | null {
  if (!state || typeof state !== "object") return null;
  const position = (state as Record<string, unknown>)[historyScrollStateKey];
  if (!position || typeof position !== "object") return null;
  const { x, y } = position as Record<string, unknown>;
  return typeof x === "number" && typeof y === "number" ? { x, y } : null;
}

export function StorefrontMotion() {
  const progressRef = useRef<HTMLDivElement>(null);
  const [popstateRevision, setPopstateRevision] = useState(0);
  const previousPathnameRef = useRef<string | null>(null);
  const popstateNavigationRef = useRef<Readonly<{
    pathname: string;
    position: HistoryScrollPosition;
  }> | null>(null);
  const pathname = usePathname();
  const searchParamsKey = useSearchParams().toString();

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    let recordFrame: number | null = null;

    const recordScrollPosition = () => {
      if (recordFrame !== null) return;
      recordFrame = window.requestAnimationFrame(() => {
        recordFrame = null;
        const state = window.history.state;
        if (!state || typeof state !== "object") return;
        window.history.replaceState(
          {
            ...state,
            [historyScrollStateKey]: { x: window.scrollX, y: window.scrollY },
          },
          "",
        );
      });
    };

    const markPopstateNavigation = (event: PopStateEvent) => {
      popstateNavigationRef.current = {
        pathname: window.location.pathname,
        position: readHistoryScrollPosition(event.state) ?? { x: 0, y: 0 },
      };
      setPopstateRevision((revision) => revision + 1);
    };

    window.history.scrollRestoration = "manual";
    recordScrollPosition();
    window.addEventListener("scroll", recordScrollPosition, { passive: true });
    window.addEventListener("popstate", markPopstateNavigation);
    return () => {
      if (recordFrame !== null) window.cancelAnimationFrame(recordFrame);
      window.history.scrollRestoration = previousScrollRestoration;
      window.removeEventListener("scroll", recordScrollPosition);
      window.removeEventListener("popstate", markPopstateNavigation);
    };
  }, []);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;
    const popstateNavigation = popstateNavigationRef.current;

    if (popstateNavigation?.pathname === pathname) {
      popstateNavigationRef.current = null;
      let restoreFrame = window.requestAnimationFrame(() => {
        restoreFrame = window.requestAnimationFrame(() => {
          const root = document.documentElement;
          const previousScrollBehavior = root.style.scrollBehavior;
          root.style.scrollBehavior = "auto";
          window.scrollTo(popstateNavigation.position.x, popstateNavigation.position.y);
          root.style.scrollBehavior = previousScrollBehavior;
        });
      });
      return () => window.cancelAnimationFrame(restoreFrame);
    }

    if (previousPathname === null || previousPathname === pathname) return;

    popstateNavigationRef.current = null;

    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo({ top: 0, left: 0 });
    root.style.scrollBehavior = previousScrollBehavior;
  }, [pathname, popstateRevision]);

  useEffect(() => {
    const contentRoot = document.getElementById("main-content");
    if (!contentRoot) return;

    const pageRoot = document.documentElement;
    const mobileCardMedia = window.matchMedia(mobileProductCardQuery);
    const reducedMotionMedia = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let cardObserver: IntersectionObserver | null = null;
    let refreshFrame: number | null = null;

    const clearMobileCardState = () => {
      contentRoot
        .querySelectorAll<HTMLElement>(
          ".aura-product-grid [data-motion-product-card]",
        )
        .forEach((card) => delete card.dataset.mobileActive);
      delete pageRoot.dataset.mobileProductCards;
    };

    const connectMobileCardObserver = () => {
      refreshFrame = null;
      cardObserver?.disconnect();
      cardObserver = null;
      clearMobileCardState();

      if (
        !mobileCardMedia.matches ||
        reducedMotionMedia.matches ||
        !("IntersectionObserver" in window)
      ) {
        return;
      }

      const productCards = Array.from(
        contentRoot.querySelectorAll<HTMLElement>(
          ".aura-product-grid [data-motion-product-card]",
        ),
      );
      if (productCards.length === 0) return;

      cardObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!(entry.target instanceof HTMLElement)) return;
            entry.target.dataset.mobileActive =
              entry.isIntersecting &&
              entry.intersectionRatio >= mobileProductCardRevealThreshold
                ? "true"
                : "false";
          });
          pageRoot.dataset.mobileProductCards = "ready";
        },
        {
          rootMargin: mobileProductCardRevealRootMargin,
          threshold: mobileProductCardRevealThreshold,
        },
      );

      productCards.forEach((card) => {
        card.dataset.mobileActive = "false";
        cardObserver?.observe(card);
      });
    };

    const scheduleMobileCardObserverRefresh = () => {
      if (refreshFrame !== null) return;
      refreshFrame = window.requestAnimationFrame(connectMobileCardObserver);
    };

    const cardGridObserver = new MutationObserver(
      scheduleMobileCardObserverRefresh,
    );
    cardGridObserver.observe(contentRoot, { childList: true, subtree: true });
    mobileCardMedia.addEventListener(
      "change",
      scheduleMobileCardObserverRefresh,
    );
    reducedMotionMedia.addEventListener(
      "change",
      scheduleMobileCardObserverRefresh,
    );
    connectMobileCardObserver();

    return () => {
      if (refreshFrame !== null) window.cancelAnimationFrame(refreshFrame);
      cardObserver?.disconnect();
      cardGridObserver.disconnect();
      mobileCardMedia.removeEventListener(
        "change",
        scheduleMobileCardObserverRefresh,
      );
      reducedMotionMedia.removeEventListener(
        "change",
        scheduleMobileCardObserverRefresh,
      );
      clearMobileCardState();
    };
  }, [pathname, searchParamsKey]);

  useEffect(() => {
    let active = true;
    let cleanup = () => {};
    let refreshFrame: number | null = null;

    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([{ default: gsap }, { ScrollTrigger }]) => {
        if (!active) return;
        gsap.registerPlugin(ScrollTrigger);
        const motionMedia = gsap.matchMedia();

        motionMedia.add(
          {
            allowMotion: "(prefers-reduced-motion: no-preference)",
            reduceMotion: "(prefers-reduced-motion: reduce)",
            showExpandedLogo: "(min-width: 640px)",
            isMobile: "(max-width: 639px)",
            isDesktop: "(min-width: 1024px)",
          },
          (context) => {
            const contentRoot = document.getElementById("main-content") ?? document;
            const productHero = contentRoot.querySelector<HTMLElement>(
              "[data-product-hero]",
            );
            const productStickyTop = contentRoot.querySelector<HTMLElement>(
              "[data-product-sticky-top]",
            );
            const productStickyBottom = contentRoot.querySelector<HTMLElement>(
              "[data-product-sticky-bottom]",
            );

            if (
              context.conditions?.isMobile &&
              productHero &&
              productStickyTop &&
              productStickyBottom
            ) {
              const stickyBars = [productStickyTop, productStickyBottom];
              gsap.set(stickyBars, { autoAlpha: 0 });

              if (context.conditions.allowMotion) {
                gsap.timeline({
                  scrollTrigger: {
                    trigger: productHero,
                    start: "bottom top",
                    end: "+=64",
                    scrub: 0.35,
                  },
                })
                  .fromTo(
                    productStickyTop,
                    { autoAlpha: 0, y: -18 },
                    { autoAlpha: 1, y: 0, duration: 1, ease: "power4.out" },
                    0,
                  )
                  .fromTo(
                    productStickyBottom,
                    { autoAlpha: 0, y: 24 },
                    { autoAlpha: 1, y: 0, duration: 1, ease: "power4.out" },
                    0,
                  );
              } else {
                ScrollTrigger.create({
                  trigger: productHero,
                  start: "bottom top-=1",
                  onEnter: () => gsap.set(stickyBars, { autoAlpha: 1 }),
                  onLeaveBack: () => gsap.set(stickyBars, { autoAlpha: 0 }),
                });
              }
            }

            if (!context.conditions?.allowMotion) return;

            const headerLogo = document.querySelector<HTMLElement>("[data-header-logo]");
            const headerLogoIcon = headerLogo?.querySelector<HTMLElement>(
              "[data-header-logo-icon]",
            );
            const headerLogoWordmark = headerLogo?.querySelector<HTMLElement>(
              "[data-header-logo-wordmark]",
            );

            if (
              context.conditions?.showExpandedLogo &&
              headerLogo &&
              headerLogoIcon &&
              headerLogoWordmark
            ) {
              const readLogoValue = (name: string) =>
                Number.parseFloat(
                  window.getComputedStyle(headerLogo).getPropertyValue(name),
                );
              const logoTimeline = gsap.timeline({
                scrollTrigger: {
                  trigger: document.documentElement,
                  start: "top top",
                  end: () => `+=${compactHeaderScrollY(window.innerWidth)}`,
                  scrub: 0.35,
                  invalidateOnRefresh: true,
                },
              });

              logoTimeline
                .fromTo(
                  headerLogoIcon,
                  { opacity: 1, scale: 1, y: 0 },
                  {
                    opacity: 0,
                    scale: 0.8,
                    y: () => readLogoValue("--aura-logo-icon-exit-y"),
                    duration: 0.58,
                    ease: "none",
                  },
                  0,
                )
                .fromTo(
                  headerLogoWordmark,
                  {
                    opacity: 1,
                    scale: () =>
                      readLogoValue("--aura-logo-wordmark-start-scale"),
                    y: () => readLogoValue("--aura-logo-wordmark-start-y"),
                  },
                  {
                    opacity: 1,
                    scale: 1,
                    y: () => readLogoValue("--aura-logo-wordmark-compact-y"),
                    duration: 0.82,
                    ease: "none",
                  },
                  0.18,
                );
            }

            if (progressRef.current) {
              gsap.fromTo(
                progressRef.current,
                { scaleX: 0 },
                {
                  scaleX: 1,
                  ease: "none",
                  scrollTrigger: {
                    trigger: document.documentElement,
                    start: "top top",
                    end: "max",
                    scrub: 0.25,
                  },
                },
              );
            }

            gsap.utils
              .toArray<HTMLElement>("[data-motion-copy]", contentRoot)
              .forEach((element) => {
                gsap.from(element, {
                  y: 36,
                  duration: 0.78,
                  ease: "power4.out",
                  scrollTrigger: {
                    trigger: element,
                    start: "top 88%",
                    once: true,
                  },
                });
              });

            const productCards = gsap.utils.toArray<HTMLElement>(
              "[data-motion-product-card]",
              contentRoot,
            );
            const griddedProductCards = new Set<HTMLElement>();

            gsap.utils
              .toArray<HTMLElement>(".aura-product-grid", contentRoot)
              .forEach((grid) => {
                const cards = gsap.utils.toArray<HTMLElement>(
                  "[data-motion-product-card]",
                  grid,
                );
                cards.forEach((card) => griddedProductCards.add(card));

                groupElementsByOffsetTop(cards).forEach((row) => {
                  const trigger = row[0];
                  if (!trigger) return;

                  gsap.from(row, {
                    y: 56,
                    duration: 0.82,
                    ease: "power4.out",
                    scrollTrigger: {
                      trigger,
                      start: "top 91%",
                      once: true,
                    },
                  });
                });
              });

            productCards
              .filter((element) => !griddedProductCards.has(element))
              .forEach((element) => {
                gsap.from(element, {
                  y: 56,
                  duration: 0.82,
                  ease: "power4.out",
                  scrollTrigger: {
                    trigger: element,
                    start: "top 91%",
                    once: true,
                  },
                });
              });

            gsap.utils
              .toArray<HTMLElement>("[data-motion-parallax]", contentRoot)
              .forEach((element) => {
                gsap.fromTo(
                  element,
                  { yPercent: -4, scale: 1.04 },
                  {
                    yPercent: 5,
                    ease: "none",
                    scrollTrigger: {
                      trigger: element.parentElement ?? element,
                      start: "top bottom",
                      end: "bottom top",
                      scrub: 0.7,
                    },
                  },
                );
              });

            const stackedPanels = gsap.utils.toArray<HTMLElement>(
              "[data-motion-stack]",
              contentRoot,
            );
            if (stackedPanels.length > 0) {
              gsap.from(stackedPanels, {
                y: 36,
                stagger: 0.08,
                duration: 0.7,
                ease: "power4.out",
                scrollTrigger: {
                  trigger: stackedPanels[0]?.parentElement ?? stackedPanels[0],
                  start: "top 84%",
                  once: true,
                },
              });
            }

            gsap.utils
              .toArray<HTMLElement>("[data-motion-float]", contentRoot)
              .forEach((element, index) => {
                gsap.fromTo(
                  element,
                  {
                    yPercent: index % 2 === 0 ? -12 : 10,
                    rotate: index % 2 === 0 ? -14 : 12,
                  },
                  {
                    yPercent: index % 2 === 0 ? 18 : -16,
                    rotate: index % 2 === 0 ? -7 : 5,
                    ease: "none",
                    scrollTrigger: {
                      trigger: element.parentElement ?? element,
                      start: "top bottom",
                      end: "bottom top",
                      scrub: 0.8,
                    },
                  },
                );
              });

            gsap.utils
              .toArray<HTMLElement>("[data-motion-ingredient-drift]", contentRoot)
              .forEach((element, index) => {
                const driftX = Number.parseFloat(element.dataset.driftX ?? "0");
                const driftY = Number.parseFloat(element.dataset.driftY ?? "0");
                const driftRotate = Number.parseFloat(
                  element.dataset.driftRotate ?? "0",
                );
                const baseRotate = Number.parseFloat(
                  element.dataset.baseRotate ?? "0",
                );

                gsap.fromTo(
                  element,
                  {
                    xPercent: -driftX,
                    yPercent: -driftY,
                    rotate: baseRotate - driftRotate,
                  },
                  {
                    xPercent: driftX,
                    yPercent: driftY,
                    rotate: baseRotate + driftRotate,
                    ease: "none",
                    scrollTrigger: {
                      trigger: element.parentElement ?? element,
                      start: "top bottom",
                      end: "bottom top",
                      scrub: 0.75 + index * 0.08,
                    },
                  },
                );
              });

            gsap.utils
              .toArray<HTMLElement>("[data-motion-horizontal]", contentRoot)
              .forEach((element, index) => {
                gsap.from(element, {
                  xPercent: index % 2 === 0 ? -12 : 12,
                  ease: "none",
                  scrollTrigger: {
                    trigger: element.parentElement ?? element,
                    start: "top bottom",
                    end: "bottom 35%",
                    scrub: 0.65,
                  },
                });
              });

            gsap.utils
              .toArray<HTMLElement>("[data-motion-stage]", contentRoot)
              .filter(
                (element) =>
                  !context.conditions?.isDesktop ||
                  !element.closest("[data-motion-journey]"),
              )
              .forEach((element, index) => {
                gsap.from(element, {
                  y: 48,
                  duration: 0.82,
                  delay: Math.min(index, 3) * 0.06,
                  ease: "power4.out",
                  scrollTrigger: {
                    trigger: element,
                    start: "top 90%",
                    once: true,
                  },
                });
              });

            const guardCleanups: Array<() => void> = [];

            gsap.utils
              .toArray<HTMLElement>("[data-motion-marquee]", contentRoot)
              .forEach((element) => {
                const marquee = gsap.to(element, {
                  xPercent: -28,
                  duration: 24,
                  repeat: -1,
                  ease: "none",
                });
                guardCleanups.push(attachContinuousMotionGuard(element, marquee));
              });

            if (context.conditions?.isDesktop) {
              gsap.utils
                .toArray<HTMLElement>("[data-motion-journey]", contentRoot)
                .forEach((section) => {
                  const pin =
                    section.querySelector<HTMLElement>("[data-motion-journey-pin]") ??
                    section;
                  const track = section.querySelector<HTMLElement>(
                    "[data-motion-journey-track]",
                  );
                  if (!track) return;

                  const horizontalTween = gsap.to(track, {
                    x: () =>
                      -Math.max(0, track.scrollWidth - pin.clientWidth),
                    ease: "none",
                    scrollTrigger: {
                      trigger: pin,
                      pin: true,
                      pinSpacing: true,
                      anticipatePin: 1,
                      start: "top top",
                      end: () =>
                        `+=${Math.max(
                          window.innerHeight,
                          track.scrollWidth - pin.clientWidth,
                        )}`,
                      scrub: 0.75,
                      invalidateOnRefresh: true,
                    },
                  });

                  gsap.utils
                    .toArray<HTMLElement>("[data-motion-stage]", section)
                    .forEach((stage) => {
                      gsap.fromTo(
                        stage,
                        { y: 28 },
                        {
                          y: 0,
                          ease: "none",
                          scrollTrigger: {
                            trigger: stage,
                            containerAnimation: horizontalTween,
                            start: "left 88%",
                            end: "left 58%",
                            scrub: true,
                          },
                        },
                      );
                    });
                });
            }

            return () => {
              guardCleanups.forEach((removeGuard) => removeGuard());
            };
          },
        );

        cleanup = () => {
          if (refreshFrame !== null) cancelAnimationFrame(refreshFrame);
          motionMedia.revert();
        };

        refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
      },
    );

    return () => {
      active = false;
      cleanup();
    };
  }, [pathname, searchParamsKey]);

  return (
    <div
      ref={progressRef}
      className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-[3px] origin-left scale-x-0 bg-[var(--aura-orange)] motion-reduce:hidden"
      aria-hidden="true"
    />
  );
}
