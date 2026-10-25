import Image from "next/image";

// Decorative ingredients that stay beside the stacking cards while they pin.
// Depth comes from size and blur; motion is owned by StorefrontMotion.
const ingredients = [
  {
    name: "bergamot",
    src: "/images/ingredient-bergamot.webp",
    className: "left-[-2.5rem] top-[12%] w-28 blur-[2px] sm:left-[4%] sm:w-40 lg:left-[12%] lg:w-48",
  },
  {
    name: "jasmine",
    src: "/images/ingredient-jasmine.webp",
    className: "right-[-2rem] top-[22%] w-24 sm:right-[5%] sm:w-36 lg:right-[13%] lg:w-44",
  },
  {
    name: "oud",
    src: "/images/ingredient-oud.webp",
    className: "bottom-[14%] left-[-2rem] w-24 sm:left-[7%] sm:w-36 lg:left-[16%] lg:w-40",
  },
  {
    name: "vanilla",
    src: "/images/ingredient-vanilla.webp",
    className: "bottom-[8%] right-[-2.5rem] w-28 blur-[3px] sm:right-[3%] sm:w-44 lg:right-[10%] lg:w-52",
  },
] as const;

export function StackAtmosphere() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-x-clip" aria-hidden="true">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {ingredients.map((ingredient, index) => (
          <span
            key={ingredient.name}
            data-motion-float-loop
            data-float-index={index}
            className={`absolute aspect-square opacity-80 ${ingredient.className}`}
          >
            <Image
              src={ingredient.src}
              alt=""
              fill
              sizes="(max-width: 640px) 7rem, (max-width: 1024px) 11rem, 13rem"
              className="object-contain drop-shadow-[0_1rem_1.2rem_rgba(0,0,0,.4)]"
            />
          </span>
        ))}
      </div>
    </div>
  );
}
