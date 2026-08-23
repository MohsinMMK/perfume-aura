"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { attachContinuousMotionGuard } from "@/lib/continuous-motion";
import { compactHeaderScrollY } from "@/lib/header-motion";

const historyScrollStateKey = "__perfumeAuraScroll";

type HistoryScrollPosition = Readonly<{
  x: number;
  y: number;
}>;

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
            isDesktop: "(min-width: 1024px)",
          },
          (context) => {
            if (!context.conditions?.allowMotion) return;

            const contentRoot = document.getElementById("main-content") ?? document;
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

            gsap.utils
              .toArray<HTMLElement>("[data-motion-product-card]", contentRoot)
              .forEach((element, index) => {
                gsap.from(element, {
                  y: 56,
                  duration: 0.82,
                  delay: Math.min(index, 4) * 0.055,
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
  }, [pathname]);

  return (
    <div
      ref={progressRef}
      className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-[3px] origin-left bg-[var(--aura-orange)]"
      aria-hidden="true"
    />
  );
}
