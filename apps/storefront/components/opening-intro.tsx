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
    let finished = false;
    let stopMotion = () => {};
    let cleanup = () => {};

    // Hand-over also stops the looping floats and skip listeners, so nothing
    // keeps ticking behind the hidden overlay for the life of the page.
    const handOver = () => {
      if (finished) return;
      finished = true;
      stopMotion();
      root.dataset.state = "done";
      window.dispatchEvent(new Event(openingIntroEndEvent));
    };

    void import("gsap").then(({ default: gsap }) => {
      if (!active) return;

      const ringElements = gsap.utils.toArray<HTMLElement>("[data-intro-ring]", root);
      const stage = root.querySelector<HTMLElement>("[data-intro-stage]");
      const logo = root.querySelector<HTMLElement>("[data-intro-logo]");
      const floaters = gsap.utils.toArray<HTMLElement>("[data-intro-ingredient]", root);
      if (!stage || !logo) {
        handOver();
        return;
      }

      const floats: gsap.core.Tween[] = [];
      const timeline = gsap.timeline({
        defaults: { ease: "expo.out" },
        onComplete: handOver,
      });

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
        .addLabel("exit", "+=0.25")
        .to(stage, { scale: 2.6, autoAlpha: 0, duration: 0.6, ease: "expo.in" }, "exit")
        .to(root, { autoAlpha: 0, duration: 0.4, ease: "power2.out" }, "exit+=0.35");

      // The opening never blocks: any intent skips straight to the hand-over.
      const skip = () => {
        if (finished || timeline.progress() > 0.92) return;
        timeline.pause();
        gsap.to(root, {
          autoAlpha: 0,
          duration: 0.24,
          ease: "power2.out",
          onComplete: handOver,
        });
      };
      skipEvents.forEach((type) =>
        window.addEventListener(type, skip, { passive: true, once: true }),
      );

      stopMotion = () => {
        skipEvents.forEach((type) => window.removeEventListener(type, skip));
        floats.forEach((tween) => tween.kill());
        timeline.kill();
        gsap.killTweensOf(root);
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
