"use client";

import { useEffect } from "react";
import {
  isPageScrollLocked,
  registerSmoothScroll,
  smoothScrollPreventSelector,
  smoothScrollQuery,
} from "@/lib/smooth-scroll";

export function SmoothScroll() {
  useEffect(() => {
    const media = window.matchMedia(smoothScrollQuery);
    let active = true;
    // Each connect owns one generation; a slower import from an earlier
    // media change must not create a second Lenis behind the current one.
    let generation = 0;
    let teardown = () => {};

    const disconnect = () => {
      teardown();
      teardown = () => {};
    };

    const connect = () => {
      disconnect();
      const current = ++generation;
      if (!media.matches) return;

      void Promise.all([
        import("lenis"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]).then(([{ default: Lenis }, { default: gsap }, { ScrollTrigger }]) => {
        if (!active || current !== generation || !media.matches) return;
        gsap.registerPlugin(ScrollTrigger);

        const lenis = new Lenis({
          lerp: 0.1,
          wheelMultiplier: 1,
          smoothWheel: true,
          syncTouch: false,
          // In-page links (the skip link above all) jump natively; letting
          // Lenis also animate them makes the page jump back and glide.
          anchors: false,
          stopInertiaOnNavigate: true,
          prevent: (node) =>
            node instanceof Element &&
            node.closest(smoothScrollPreventSelector) !== null,
          virtualScroll: () =>
            !isPageScrollLocked(document.documentElement, document.body),
        });

        // Official Lenis + ScrollTrigger wiring: one clock, no lag smoothing.
        lenis.on("scroll", ScrollTrigger.update);
        const tick = (time: number) => lenis.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
        registerSmoothScroll(lenis);

        // Keyboard and focus scrolling are native; end any wheel glide first
        // so it cannot pull the page back from where the browser moved it.
        const yieldToNativeScroll = () => {
          if (lenis.isScrolling !== "smooth") return;
          lenis.stop();
          lenis.start();
        };
        window.addEventListener("keydown", yieldToNativeScroll, { capture: true });
        document.addEventListener("focusin", yieldToNativeScroll, { capture: true });

        teardown = () => {
          window.removeEventListener("keydown", yieldToNativeScroll, { capture: true });
          document.removeEventListener("focusin", yieldToNativeScroll, { capture: true });
          registerSmoothScroll(null);
          gsap.ticker.remove(tick);
          gsap.ticker.lagSmoothing(500, 33);
          lenis.destroy();
        };
      });
    };

    connect();
    media.addEventListener("change", connect);
    return () => {
      active = false;
      media.removeEventListener("change", connect);
      disconnect();
    };
  }, []);

  return null;
}
