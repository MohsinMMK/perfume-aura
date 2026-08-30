"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

const ingredients = [
  {
    name: "Bergamot",
    src: "/images/ingredient-bergamot.webp",
    depth: 0.72,
    tilt: 4.5,
    driftX: 3,
    driftY: 5,
    driftRotate: 3,
    baseRotate: -11,
    sizes: "(max-width: 640px) 9rem, (max-width: 1024px) 16rem, 20rem",
    wrapperClassName:
      "-left-20 top-[9%] h-28 w-44 rotate-[-11deg] opacity-[.72] sm:-left-10 sm:top-[11%] sm:h-40 sm:w-64 sm:opacity-[.88] lg:left-[3%] lg:top-[10%] lg:h-52 lg:w-80",
  },
  {
    name: "Jasmine",
    src: "/images/ingredient-jasmine.webp",
    depth: 0.48,
    tilt: 3.5,
    driftX: -2,
    driftY: 4,
    driftRotate: -2.5,
    baseRotate: 8,
    sizes: "(max-width: 640px) 7rem, (max-width: 1024px) 11rem, 18rem",
    wrapperClassName:
      "-right-8 top-[17%] h-48 w-28 rotate-[8deg] opacity-[.65] sm:-right-4 sm:top-[10%] sm:h-72 sm:w-44 sm:opacity-[.82] lg:right-[4%] lg:top-[7%] lg:h-[27rem] lg:w-[18rem]",
  },
  {
    name: "Oud",
    src: "/images/ingredient-oud.webp",
    depth: 0.9,
    tilt: 5.5,
    driftX: 4,
    driftY: -3,
    driftRotate: 2,
    baseRotate: 7,
    sizes: "(max-width: 640px) 8rem, (max-width: 1024px) 12rem, 16rem",
    wrapperClassName:
      "-left-10 bottom-[4%] h-28 w-36 rotate-[7deg] opacity-[.78] sm:left-[4%] sm:bottom-[5%] sm:h-40 sm:w-48 sm:opacity-90 lg:left-[8%] lg:bottom-[3%] lg:h-52 lg:w-64",
  },
  {
    name: "Vanilla",
    src: "/images/ingredient-vanilla.webp",
    depth: 0.64,
    tilt: 4,
    driftX: -3.5,
    driftY: -5,
    driftRotate: 3.5,
    baseRotate: -13,
    sizes: "(max-width: 640px) 7rem, (max-width: 1024px) 11rem, 15rem",
    wrapperClassName:
      "-right-10 bottom-[5%] h-36 w-32 rotate-[-13deg] opacity-[.72] sm:right-[3%] sm:bottom-[4%] sm:h-44 sm:w-44 sm:opacity-[.88] lg:right-[9%] lg:bottom-[3%] lg:h-56 lg:w-60",
  },
] as const;

export function IngredientAtmosphere() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const precisePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motionStates = Array.from(
      root.querySelectorAll<HTMLElement>("[data-ingredient-layer]"),
    ).flatMap((layer) => {
      const owner = layer.closest<HTMLElement>("[data-ingredient-item]");
      return owner
        ? [
            {
              owner,
              layer,
              frame: null as number | null,
              currentX: 0,
              currentY: 0,
              targetX: 0,
              targetY: 0,
              currentScale: 1,
              targetScale: 1,
            },
          ]
        : [];
    });

    const requestRender = (state: (typeof motionStates)[number]) => {
      if (state.frame !== null) return;

      const render = () => {
        state.currentX += (state.targetX - state.currentX) * 0.14;
        state.currentY += (state.targetY - state.currentY) * 0.14;
        state.currentScale += (state.targetScale - state.currentScale) * 0.14;

        const depth = Number.parseFloat(state.layer.dataset.depth ?? "0");
        const tilt = Number.parseFloat(state.layer.dataset.tilt ?? "0");
        const x = state.currentX * depth * 24;
        const y = state.currentY * depth * 18;
        state.layer.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotateX(${(-state.currentY * tilt).toFixed(2)}deg) rotateY(${(state.currentX * tilt).toFixed(2)}deg) scale(${state.currentScale.toFixed(4)})`;

        if (
          Math.abs(state.targetX - state.currentX) > 0.002 ||
          Math.abs(state.targetY - state.currentY) > 0.002 ||
          Math.abs(state.targetScale - state.currentScale) > 0.0002
        ) {
          state.frame = window.requestAnimationFrame(render);
        } else {
          state.frame = null;
        }
      };

      state.frame = window.requestAnimationFrame(render);
    };

    const settle = (state: (typeof motionStates)[number]) => {
      state.targetX = 0;
      state.targetY = 0;
      state.targetScale = 1;
      requestRender(state);
    };

    const resetImmediately = (state: (typeof motionStates)[number]) => {
      if (state.frame !== null) {
        window.cancelAnimationFrame(state.frame);
        state.frame = null;
      }
      state.currentX = 0;
      state.currentY = 0;
      state.targetX = 0;
      state.targetY = 0;
      state.currentScale = 1;
      state.targetScale = 1;
      state.layer.style.removeProperty("transform");
    };

    const removePointerListeners = motionStates.map((state) => {
      const handlePointerMove = (event: PointerEvent) => {
        if (reducedMotion.matches || !precisePointer.matches) return;
        const bounds = state.owner.getBoundingClientRect();
        state.targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
        state.targetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
        state.targetScale = 1.025;
        requestRender(state);
      };
      const handlePointerLeave = () => settle(state);

      state.owner.addEventListener("pointermove", handlePointerMove, { passive: true });
      state.owner.addEventListener("pointerleave", handlePointerLeave);

      return () => {
        state.owner.removeEventListener("pointermove", handlePointerMove);
        state.owner.removeEventListener("pointerleave", handlePointerLeave);
      };
    });

    const handleMotionPreferenceChange = () => {
      if (reducedMotion.matches || !precisePointer.matches) {
        motionStates.forEach(resetImmediately);
      }
    };

    reducedMotion.addEventListener("change", handleMotionPreferenceChange);
    precisePointer.addEventListener("change", handleMotionPreferenceChange);

    return () => {
      removePointerListeners.forEach((removeListeners) => removeListeners());
      reducedMotion.removeEventListener("change", handleMotionPreferenceChange);
      precisePointer.removeEventListener("change", handleMotionPreferenceChange);
      motionStates.forEach((state) => {
        if (state.frame !== null) window.cancelAnimationFrame(state.frame);
      });
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-0 [perspective:900px]"
      aria-hidden="true"
    >
      {ingredients.map((ingredient) => (
        <div
          key={ingredient.name}
          data-ingredient-item
          data-ingredient-name={ingredient.name}
          data-motion-ingredient-drift
          data-drift-x={ingredient.driftX}
          data-drift-y={ingredient.driftY}
          data-drift-rotate={ingredient.driftRotate}
          data-base-rotate={ingredient.baseRotate}
          className={`pointer-events-auto absolute ${ingredient.wrapperClassName}`}
        >
          <div
            data-ingredient-layer
            data-depth={ingredient.depth}
            data-tilt={ingredient.tilt}
            className="relative size-full origin-center will-change-transform [transform-style:preserve-3d]"
          >
            <Image
              src={ingredient.src}
              alt=""
              fill
              sizes={ingredient.sizes}
              className="object-contain drop-shadow-[0_1.5rem_1.2rem_rgba(0,0,0,.38)]"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
