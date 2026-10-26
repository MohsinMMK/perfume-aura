"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { attachContinuousMotionGuard } from "@/lib/continuous-motion";
import { compactHeaderScrollY } from "@/lib/header-motion";
import { jumpWindowScroll } from "@/lib/smooth-scroll";

const historyScrollStateKey = "__perfumeAuraScroll";
const mobileProductCardQuery = "(max-width: 639px)";
const mobileProductCardRevealRootMargin = "-49% 0px -49% 0px";
const mobileProductCardRevealThreshold = 0;
const scrollRecordDelayMs = 150;

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

// Entrance tweens play once per element; filter or search updates re-run the
// motion effect, and replaying them would make visible content jump.
function hasPendingMotion(element: HTMLElement): boolean {
  return element.dataset.motionEntered !== "true";
}

function markEnteredMotion(elements: readonly HTMLElement[]): void {
  elements.forEach((element) => {
    element.dataset.motionEntered = "true";
  });
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
    let recordTimer: number | null = null;

    const writeScrollPosition = () => {
      recordTimer = null;
      const state = window.history.state;
      if (!state || typeof state !== "object") return;
      window.history.replaceState(
        {
          ...state,
          [historyScrollStateKey]: { x: window.scrollX, y: window.scrollY },
        },
        "",
      );
    };

    // Browsers rate-limit history writes, so record once scrolling settles
    // and flush before a click can navigate away from this entry.
    const recordScrollPosition = () => {
      if (recordTimer !== null) window.clearTimeout(recordTimer);
      recordTimer = window.setTimeout(writeScrollPosition, scrollRecordDelayMs);
    };

    const flushScrollPosition = () => {
      if (recordTimer === null) return;
      window.clearTimeout(recordTimer);
      writeScrollPosition();
    };

    const markPopstateNavigation = (event: PopStateEvent) => {
      popstateNavigationRef.current = {
        pathname: window.location.pathname,
        position: readHistoryScrollPosition(event.state) ?? { x: 0, y: 0 },
      };
      setPopstateRevision((revision) => revision + 1);
    };

    window.history.scrollRestoration = "manual";
    writeScrollPosition();
    window.addEventListener("scroll", recordScrollPosition, { passive: true });
    document.addEventListener("click", flushScrollPosition, { capture: true });
    window.addEventListener("pagehide", flushScrollPosition);
    window.addEventListener("popstate", markPopstateNavigation);
    return () => {
      if (recordTimer !== null) window.clearTimeout(recordTimer);
      window.history.scrollRestoration = previousScrollRestoration;
      window.removeEventListener("scroll", recordScrollPosition);
      document.removeEventListener("click", flushScrollPosition, { capture: true });
      window.removeEventListener("pagehide", flushScrollPosition);
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
          jumpWindowScroll(
            popstateNavigation.position.x,
            popstateNavigation.position.y,
          );
        });
      });
      return () => window.cancelAnimationFrame(restoreFrame);
    }

    if (previousPathname === null || previousPathname === pathname) return;

    popstateNavigationRef.current = null;
    jumpWindowScroll(0, 0);
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
  }, [pathname]);

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
              .filter(hasPendingMotion)
              .forEach((element) => {
                gsap.from(element, {
                  y: 36,
                  duration: 0.78,
                  ease: "power4.out",
                  scrollTrigger: {
                    trigger: element,
                    start: "top 88%",
                    once: true,
                    onEnter: () => markEnteredMotion([element]),
                  },
                });
              });

            gsap.utils
              .toArray<HTMLElement>("[data-motion-compose]", contentRoot)
              .filter(hasPendingMotion)
              .forEach((element) => {
                const pieces = gsap.utils.toArray<HTMLElement>(
                  "[data-motion-compose-piece]",
                  element,
                );
                if (pieces.length === 0) return;

                gsap.from(pieces, {
                  y: (index) => (index % 2 === 0 ? 18 : -14),
                  scaleX: 0.92,
                  rotateX: (index) => (index % 2 === 0 ? -7 : 7),
                  filter: "blur(3px)",
                  transformOrigin: "50% 100%",
                  stagger: { each: 0.032, from: "center" },
                  duration: 0.96,
                  ease: "power4.out",
                  clearProps: "filter,transform",
                  scrollTrigger: {
                    trigger: element,
                    start: "top 84%",
                    once: true,
                    onEnter: () => markEnteredMotion([element]),
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

                groupElementsByOffsetTop(cards).forEach((cardRow) => {
                  const row = cardRow.filter(hasPendingMotion);
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
                      onEnter: () => markEnteredMotion(row),
                    },
                  });
                });
              });

            productCards
              .filter((element) => !griddedProductCards.has(element))
              .filter(hasPendingMotion)
              .forEach((element) => {
                gsap.from(element, {
                  y: 56,
                  duration: 0.82,
                  ease: "power4.out",
                  scrollTrigger: {
                    trigger: element,
                    start: "top 91%",
                    once: true,
                    onEnter: () => markEnteredMotion([element]),
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

            // Outline titles settle letter by letter as their section scrolls in.
            gsap.utils
              .toArray<HTMLElement>("[data-motion-letters]", contentRoot)
              .forEach((title) => {
                const letters = gsap.utils.toArray<HTMLElement>("[data-motion-letter]", title);
                if (letters.length === 0) return;
                gsap.fromTo(
                  letters,
                  { yPercent: (index) => -80 + (index * 70) / letters.length },
                  {
                    yPercent: 0,
                    ease: "none",
                    scrollTrigger: {
                      trigger: title,
                      start: "top bottom",
                      end: "bottom 55%",
                      scrub: 0.6,
                    },
                  },
                );
              });

            if (context.conditions?.isDesktop) {
              gsap.utils
                .toArray<HTMLElement>("[data-motion-track]", contentRoot)
                .forEach((track) => {
                  gsap.fromTo(
                    track,
                    { xPercent: 14 },
                    {
                      xPercent: 0,
                      ease: "none",
                      scrollTrigger: {
                        trigger: track,
                        start: "top bottom",
                        end: "top 45%",
                        scrub: 0.6,
                      },
                    },
                  );
                });
            }

            const guardCleanups: Array<() => void> = [];

            // Sticky CSS owns the stack; motion only tilts each card in and
            // darkens the bars it covers. Ranges come from the list's natural
            // layout because a stuck sticky item reports its stuck position.
            gsap.utils
              .toArray<HTMLElement>("[data-motion-stack-section]", contentRoot)
              .forEach((section) => {
                const list = section.querySelector<HTMLElement>(".aura-stack");
                const items = gsap.utils.toArray<HTMLElement>(
                  "[data-motion-stack-item]",
                  section,
                );
                if (!list || items.length === 0) return;

                const shades = items.map((item) =>
                  item.querySelector<HTMLElement>("[data-motion-stack-shade]"),
                );
                const arrivals = items.map(() => 0);
                const paintShades = () => {
                  shades.forEach((shade, index) => {
                    if (!shade) return;
                    const covering = arrivals
                      .slice(index + 1)
                      .reduce((sum, arrival) => sum + arrival, 0);
                    shade.style.opacity = Math.min(0.6, covering * 0.2).toFixed(3);
                  });
                };
                const naturalTop = (index: number) =>
                  items.slice(0, index).reduce((offset, item) => {
                    const marginBottom = Number.parseFloat(
                      window.getComputedStyle(item).marginBottom,
                    );
                    return offset + item.offsetHeight + (marginBottom || 0);
                  }, 0);
                const stickyTop = (item: HTMLElement) =>
                  Number.parseFloat(window.getComputedStyle(item).top) || 0;

                items.forEach((item, index) => {
                  const card = item.querySelector<HTMLElement>(
                    "[data-motion-stack-card]",
                  );
                  if (!card) return;

                  gsap.fromTo(
                    card,
                    {
                      rotate: index % 2 === 0 ? -4 : 3.5,
                      yPercent: 10,
                      scale: 0.96,
                    },
                    {
                      rotate: 0,
                      yPercent: 0,
                      scale: 1,
                      ease: "none",
                      scrollTrigger: {
                        trigger: list,
                        start: () => `top+=${naturalTop(index)} bottom`,
                        end: () =>
                          `top+=${naturalTop(index)} ${stickyTop(item)}px`,
                        scrub: 0.6,
                        invalidateOnRefresh: true,
                        onUpdate: (self) => {
                          arrivals[index] = self.progress;
                          paintShades();
                        },
                      },
                    },
                  );
                });

                guardCleanups.push(() => {
                  shades.forEach((shade) => shade?.style.removeProperty("opacity"));
                });
              });

            gsap.utils
              .toArray<HTMLElement>("[data-motion-float-loop]", contentRoot)
              .forEach((element) => {
                const index = Number.parseInt(element.dataset.floatIndex ?? "0", 10);
                const direction = index % 2 === 0 ? 1 : -1;
                const float = gsap.to(element, {
                  keyframes: {
                    x: [0, 14 * direction, -8 * direction, 0],
                    y: [0, -18, 10, 0],
                    rotate: [0, 6 * direction, -4 * direction, 0],
                  },
                  duration: 7 + index * 1.3,
                  ease: "sine.inOut",
                  repeat: -1,
                });
                guardCleanups.push(attachContinuousMotionGuard(element, float));
              });

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
              .filter(hasPendingMotion)
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
                    onEnter: () => markEnteredMotion([element]),
                  },
                });
              });

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

            // The steps ride a large circle while the stage pins. Geometry
            // is recomputed on every refresh so each viewport keeps one step
            // centred and its neighbours peeking in from the edges.
            gsap.utils
              .toArray<HTMLElement>("[data-motion-arc]", contentRoot)
              .forEach((section) => {
                const pin = section.querySelector<HTMLElement>("[data-motion-arc-pin]");
                const wheel = section.querySelector<HTMLElement>("[data-motion-arc-wheel]");
                const heading = section.querySelector<HTMLElement>(
                  "[data-motion-arc-heading]",
                );
                const items = gsap.utils.toArray<HTMLElement>(
                  "[data-motion-arc-item]",
                  section,
                );
                if (!pin || !wheel || items.length < 2) return;

                let stepDegrees = 24;
                const layoutArc = () => {
                  const width = section.clientWidth || window.innerWidth;
                  const rem =
                    Number.parseFloat(
                      window.getComputedStyle(document.documentElement).fontSize,
                    ) || 16;
                  const itemWidth = Math.min(28 * rem, width * 0.82);
                  const radius = Math.max(
                    width * (context.conditions?.isMobile ? 1.7 : 0.95),
                    40 * rem,
                  );
                  stepDegrees = ((itemWidth * 1.3) / radius) * (180 / Math.PI);
                  section.style.setProperty("--aura-arc-item", `${itemWidth}px`);
                  section.style.setProperty("--aura-arc-radius", `${radius}px`);
                  section.style.setProperty("--aura-arc-step", `${stepDegrees}deg`);
                  section.style.setProperty("--aura-arc-center", "46%");
                };
                const paintArc = () => {
                  const rotation = Number(gsap.getProperty(wheel, "rotate")) || 0;
                  items.forEach((item, index) => {
                    const distance = Math.abs(index * stepDegrees + rotation) / stepDegrees;
                    item.style.opacity = gsap.utils
                      .clamp(0.16, 1, 1 - distance * 0.72)
                      .toFixed(3);
                  });
                };

                section.dataset.arcReady = "true";
                layoutArc();
                ScrollTrigger.addEventListener("refreshInit", layoutArc);

                if (heading) {
                  gsap.fromTo(
                    heading,
                    { rotate: -9, yPercent: 18, scale: 0.9 },
                    {
                      rotate: 0,
                      yPercent: 0,
                      scale: 1,
                      ease: "none",
                      scrollTrigger: {
                        trigger: section,
                        start: "top bottom",
                        end: "top top",
                        scrub: 0.6,
                      },
                    },
                  );
                }

                gsap.fromTo(
                  wheel,
                  { rotate: 0 },
                  {
                    rotate: () => -(items.length - 1) * stepDegrees,
                    ease: "none",
                    onUpdate: paintArc,
                    scrollTrigger: {
                      trigger: pin,
                      pin: true,
                      pinSpacing: true,
                      anticipatePin: 1,
                      start: "top top",
                      end: () =>
                        `+=${Math.round((items.length - 1) * window.innerHeight * 0.85)}`,
                      scrub: 0.8,
                      invalidateOnRefresh: true,
                    },
                  },
                );
                paintArc();

                guardCleanups.push(() => {
                  ScrollTrigger.removeEventListener("refreshInit", layoutArc);
                  delete section.dataset.arcReady;
                  [
                    "--aura-arc-item",
                    "--aura-arc-radius",
                    "--aura-arc-step",
                    "--aura-arc-center",
                  ].forEach((property) => section.style.removeProperty(property));
                  items.forEach((item) => item.style.removeProperty("opacity"));
                });
              });

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
