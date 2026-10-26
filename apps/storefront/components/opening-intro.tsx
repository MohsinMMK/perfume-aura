"use client";

import Image from "next/image";
import { type CSSProperties, useEffect, useRef } from "react";
import {
  openingIntroEndEvent,
  openingIntroGateScript,
} from "@/lib/opening-intro";

const rings = ["brass", "orange", "red", "ink"] as const;

const ingredients = [
  { name: "bergamot", src: "/images/ingredient-bergamot.webp", x: -1, y: -1, rotate: -14 },
  { name: "jasmine", src: "/images/ingredient-jasmine.webp", x: 1, y: -1, rotate: 10 },
  { name: "oud", src: "/images/ingredient-oud.webp", x: -1, y: 1, rotate: 8 },
  { name: "vanilla", src: "/images/ingredient-vanilla.webp", x: 1, y: 1, rotate: -12 },
] as const;

const skipEvents = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

export function OpeningIntro() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || root.dataset.state !== "play") return;

    let active = true;
    let released = false;
    let finished = false;
    let stopMotion = () => {};
    let cleanup = () => {};

    // Release starts the hero entrance once the ingredients have cleared and
    // the logo is dissolving. The overlay is click-through from here until
    // the logo has gone. If the gate's failsafe already handed the page over,
    // the overlay must never come back, so only the motion is stopped.
    const release = () => {
      if (released) return;
      released = true;
      if (root.dataset.state !== "play") {
        finished = true;
        stopMotion();
        return;
      }
      root.dataset.state = "exit";
      window.dispatchEvent(new Event(openingIntroEndEvent));
    };

    // Hand-over also stops the looping floats and skip listeners, so nothing
    // keeps ticking behind the hidden overlay for the life of the page.
    const handOver = () => {
      if (finished) return;
      release();
      finished = true;
      stopMotion();
      root.dataset.state = "done";
    };

    void import("gsap").then(({ default: gsap }) => {
      if (!active) return;
      if (root.dataset.state !== "play") {
        handOver();
        return;
      }

      const ringElements = gsap.utils.toArray<HTMLElement>("[data-intro-ring]", root);
      const inkRing = ringElements.at(-1);
      const logo = root.querySelector<HTMLElement>("[data-intro-logo]");
      const floaters = gsap.utils.toArray<HTMLElement>("[data-intro-ingredient]", root);
      if (!inkRing || !logo) {
        handOver();
        return;
      }

      const floats: gsap.core.Tween[] = [];
      let exitTimeline: gsap.core.Timeline | undefined;

      // The hand-over runs in order: the ingredients fly off, the logo lifts
      // and dissolves in place while the ink clears, then the hero takes over
      // with its heading first and the bottle after it.
      const exit = (speed: number) => {
        if (exitTimeline) return;
        floats.forEach((tween) => tween.kill());

        exitTimeline = gsap
          .timeline({ onComplete: handOver })
          .set(ringElements.slice(0, -1), { autoAlpha: 0 }, 0)
          .set(inkRing, { scale: 1 }, 0)
          .set(root, { backgroundColor: "transparent" }, 0)
          .to(
            floaters,
            {
              xPercent: (index) => (ingredients[index]?.x ?? 1) * 420,
              yPercent: (index) => (ingredients[index]?.y ?? 1) * 320,
              rotate: (index) => (ingredients[index]?.rotate ?? 0) * 3,
              duration: 0.75,
              ease: "back.in(1.4)",
              stagger: 0.05,
            },
            0,
          )
          // A skip can catch the logo mid-entrance, so the lift is relative
          // to wherever it is rather than to its settled pose. It rises
          // toward the heading and evaporates on the way.
          .set(logo, { filter: "blur(0px)" }, 0)
          .to(
            logo,
            { y: `-=${Math.round(window.innerHeight * 0.24)}`, scale: "*=1.18", duration: 1, ease: "power2.out" },
            0.25,
          )
          .to(logo, { autoAlpha: 0, filter: "blur(14px)", duration: 0.7, ease: "power1.in" }, 0.35)
          .to(inkRing, { autoAlpha: 0, duration: 0.6, ease: "power1.inOut" }, 0.4)
          .call(release, undefined, 0.6);
        exitTimeline.timeScale(speed);
      };

      const timeline = gsap.timeline({ defaults: { ease: "expo.out" } });

      timeline
        .fromTo(
          ringElements,
          { scale: 0 },
          { scale: 1, duration: 0.9, ease: "power3.inOut", stagger: 0.12 },
          0,
        )
        .set(ringElements.slice(0, -1), { autoAlpha: 0 })
        .fromTo(
          logo,
          { autoAlpha: 0, scale: 0.72, y: 18 },
          { autoAlpha: 1, scale: 1, y: 0, duration: 0.7 },
          "-=0.25",
        )
        .fromTo(
          floaters,
          {
            autoAlpha: 0,
            xPercent: (index) => (ingredients[index]?.x ?? 1) * 260,
            yPercent: (index) => (ingredients[index]?.y ?? 1) * 180,
            rotate: (index) => (ingredients[index]?.rotate ?? 0) * 4,
            scale: 0.6,
          },
          {
            autoAlpha: 1,
            xPercent: 0,
            yPercent: 0,
            rotate: (index) => ingredients[index]?.rotate ?? 0,
            scale: 1,
            duration: 0.8,
            stagger: 0.06,
            onComplete: () => {
              floaters.forEach((floater, index) => {
                floats.push(
                  gsap.to(floater, {
                    y: index % 2 === 0 ? -10 : 10,
                    duration: 1.4,
                    ease: "sine.inOut",
                    yoyo: true,
                    repeat: -1,
                  }),
                );
              });
            },
          },
          "<0.08",
        )
        .call(() => exit(1), undefined, "+=0.45");

      // The opening never blocks: any intent runs the same hand-over at
      // double speed from wherever the opening is.
      const skip = () => {
        if (exitTimeline) return;
        if (root.dataset.state !== "play") {
          handOver();
          return;
        }
        timeline.pause();
        gsap.set(logo, { autoAlpha: 1 });
        exit(2);
      };
      skipEvents.forEach((type) =>
        window.addEventListener(type, skip, { passive: true, once: true }),
      );

      stopMotion = () => {
        skipEvents.forEach((type) => window.removeEventListener(type, skip));
        floats.forEach((tween) => tween.kill());
        timeline.kill();
        exitTimeline?.kill();
      };
      cleanup = handOver;
    }, () => {
      if (active) handOver();
    });

    return () => {
      active = false;
      cleanup();
    };
  }, []);

  return (
    <>
      <div
        ref={rootRef}
        data-opening-intro
        aria-hidden="true"
        suppressHydrationWarning
        className="aura-intro"
      >
        {rings.map((ring) => (
          <span
            key={ring}
            data-intro-ring
            className={`aura-intro__ring aura-intro__ring--${ring}`}
          />
        ))}
        <div data-intro-stage className="aura-intro__stage">
          {ingredients.map((ingredient) => (
            <span
              key={ingredient.name}
              data-intro-ingredient
              className="aura-intro__ingredient"
              style={{
                "--aura-intro-x": ingredient.x,
                "--aura-intro-y": ingredient.y,
              } as CSSProperties}
            >
              <Image
                src={ingredient.src}
                alt=""
                fill
                sizes="(max-width: 640px) 6rem, 11rem"
                className="object-contain"
              />
            </span>
          ))}
          <Image
            data-intro-logo
            src="/brand/perfume-aura-icon.svg"
            alt=""
            width={271}
            height={386}
            className="aura-intro__logo"
          />
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: openingIntroGateScript }} />
    </>
  );
}
