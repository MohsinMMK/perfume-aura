"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let active = true;
    let cleanup = () => {};
    let refreshFrame: number | null = null;

    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([{ default: gsap }, { ScrollTrigger }]) => {
        if (!active) return;
        gsap.registerPlugin(ScrollTrigger);
        const listenerCleanups: Array<() => void> = [];
        const motionMedia = gsap.matchMedia();

        const context = gsap.context(() => {
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

          gsap.utils.toArray<HTMLElement>("[data-motion-copy]").forEach((element) => {
            gsap.from(element, {
              y: 44,
              clipPath: "inset(0 0 100% 0)",
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
            .toArray<HTMLElement>("[data-motion-product-card]")
            .forEach((element, index) => {
              gsap.from(element, {
                y: 72,
                rotate: index % 2 === 0 ? -0.8 : 0.8,
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

          gsap.utils.toArray<HTMLElement>("[data-motion-parallax]").forEach((element) => {
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

          const trustItems = gsap.utils.toArray<HTMLElement>("[data-motion-trust]");
          if (trustItems.length > 0) {
            gsap.from(trustItems, {
              y: 28,
              stagger: 0.08,
              duration: 0.55,
              ease: "power4.out",
              scrollTrigger: {
                trigger: trustItems[0]?.parentElement ?? trustItems[0],
                start: "top 88%",
                once: true,
              },
            });
          }

          gsap.utils.toArray<HTMLElement>("[data-motion-rule]").forEach((element) => {
            gsap.from(element, {
              scaleX: 0,
              transformOrigin: "left center",
              duration: 0.9,
              ease: "power4.out",
              scrollTrigger: {
                trigger: element,
                start: "top 92%",
                once: true,
              },
            });
          });

          const stackedPanels = gsap.utils.toArray<HTMLElement>("[data-motion-stack]");
          if (stackedPanels.length > 0) {
            gsap.from(stackedPanels, {
              y: 70,
              rotate: (index) => index % 2 === 0 ? -1.4 : 1.4,
              stagger: 0.09,
              duration: 0.82,
              ease: "power4.out",
              scrollTrigger: {
                trigger: stackedPanels[0]?.parentElement ?? stackedPanels[0],
                start: "top 84%",
                once: true,
              },
            });
          }

          gsap.utils.toArray<HTMLElement>("[data-motion-float]").forEach((element, index) => {
            gsap.fromTo(
              element,
              { yPercent: index % 2 === 0 ? -12 : 10, rotate: index % 2 === 0 ? -14 : 12 },
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

          gsap.utils.toArray<HTMLElement>("[data-motion-horizontal]").forEach((element, index) => {
            gsap.from(element, {
              xPercent: index % 2 === 0 ? -18 : 18,
              ease: "none",
              scrollTrigger: {
                trigger: element.parentElement ?? element,
                start: "top bottom",
                end: "bottom 35%",
                scrub: 0.65,
              },
            });
          });

          gsap.utils.toArray<HTMLElement>("[data-motion-stage]").forEach((element, index) => {
            gsap.from(element, {
              y: 90 + index * 24,
              rotate: index === 1 ? 1.8 : index === 2 ? -1.8 : 0,
              duration: 0.9,
              ease: "power4.out",
              scrollTrigger: { trigger: element, start: "top 90%", once: true },
            });
          });

          gsap.utils.toArray<HTMLElement>("[data-motion-marquee]").forEach((element) => {
            const marquee = gsap.to(element, {
              xPercent: -28,
              duration: 24,
              repeat: -1,
              ease: "none",
            });

            const pause = () => marquee.pause();
            const resumeWhenIdle = () => {
              if (
                !document.hidden &&
                !element.matches(":hover") &&
                !element.matches(":focus-within")
              ) {
                marquee.resume();
              }
            };
            const handleFocusOut = (event: FocusEvent) => {
              const nextTarget = event.relatedTarget;
              if (!(nextTarget instanceof Node) || !element.contains(nextTarget)) {
                resumeWhenIdle();
              }
            };
            const handleVisibilityChange = () => {
              if (document.hidden) pause();
              else resumeWhenIdle();
            };

            element.addEventListener("mouseenter", pause);
            element.addEventListener("mouseleave", resumeWhenIdle);
            element.addEventListener("focusin", pause);
            element.addEventListener("focusout", handleFocusOut);
            document.addEventListener("visibilitychange", handleVisibilityChange);

            listenerCleanups.push(() => {
              element.removeEventListener("mouseenter", pause);
              element.removeEventListener("mouseleave", resumeWhenIdle);
              element.removeEventListener("focusin", pause);
              element.removeEventListener("focusout", handleFocusOut);
              document.removeEventListener("visibilitychange", handleVisibilityChange);
            });
          });

          motionMedia.add("(min-width: 1024px)", () => {
            gsap.utils.toArray<HTMLElement>("[data-motion-journey]").forEach((section) => {
              const track = section.querySelector<HTMLElement>("[data-motion-journey-track]");
              if (!track) return;
              gsap.to(track, {
                x: () => -Math.max(0, track.scrollWidth - window.innerWidth + 32),
                ease: "none",
                scrollTrigger: {
                  trigger: section,
                  start: "top top",
                  end: "bottom bottom",
                  scrub: 0.75,
                  invalidateOnRefresh: true,
                },
              });
            });
          });
        });

        cleanup = () => {
          if (refreshFrame !== null) cancelAnimationFrame(refreshFrame);
          listenerCleanups.forEach((removeListeners) => removeListeners());
          motionMedia.revert();
          context.revert();
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
