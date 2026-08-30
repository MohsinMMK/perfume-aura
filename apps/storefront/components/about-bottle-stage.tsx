"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const frames = [
  {
    src: "/images/bottle-detail.webp",
    alt: "Close studio detail of a Perfume Aura bottle",
  },
  {
    src: "/images/regent-noir-50ml.webp",
    alt: "Perfume Aura Regent Noir bottle",
  },
  {
    src: "/images/hero-bottle-still-life.webp",
    alt: "Perfume Aura bottles arranged in the studio",
  },
] as const;
const frameTransitionIntervalMs = 1500;

export function AboutBottleStage() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    let timer: number | undefined;
    let completedTransitions = 0;
    const stop = () => {
      if (timer !== undefined) {
        window.clearInterval(timer);
        timer = undefined;
      }
    };
    const syncMotionPreference = () => {
      stop();
      if (
        motion.matches &&
        !document.hidden &&
        completedTransitions < frames.length - 1
      ) {
        timer = window.setInterval(() => {
          setActiveIndex((current) => (current + 1) % frames.length);
          completedTransitions += 1;
          if (completedTransitions >= frames.length - 1) stop();
        }, frameTransitionIntervalMs);
      }
    };

    syncMotionPreference();
    motion.addEventListener("change", syncMotionPreference);
    document.addEventListener("visibilitychange", syncMotionPreference);
    return () => {
      stop();
      motion.removeEventListener("change", syncMotionPreference);
      document.removeEventListener("visibilitychange", syncMotionPreference);
    };
  }, []);

  return (
    <div className="absolute inset-y-0 right-0 w-[62%] overflow-hidden lg:w-[48%]" role="img" aria-label={frames[activeIndex]?.alt ?? frames[0].alt}>
      {frames.map((frame, index) => (
        <Image
          key={frame.src}
          src={frame.src}
          alt=""
          fill
          preload={index === 0}
          sizes="(max-width: 1024px) 62vw, 48vw"
          className={`object-cover transition-opacity duration-700 ease-out ${
            index === activeIndex ? "opacity-45" : "opacity-0"
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--aura-ink)] via-transparent to-transparent" />
    </div>
  );
}
