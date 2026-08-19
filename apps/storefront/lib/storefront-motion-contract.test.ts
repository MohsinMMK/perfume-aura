import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const readStorefront = (relativePath: string) =>
  readFile(new URL(relativePath, import.meta.url), "utf8");

describe("storefront motion contract", () => {
  it("removes the blocking first-load intro and keeps native scroll", async () => {
    const [shell, globals, layout] = await Promise.all([
      readStorefront("../components/storefront-shell.tsx"),
      readStorefront("../app/globals.css"),
      readStorefront("../app/layout.tsx"),
    ]);

    assert.doesNotMatch(shell, /OpeningIntro/);
    assert.doesNotMatch(globals, /\.opening-intro/);
    assert.match(globals, /html\s*\{[\s\S]*scroll-behavior:\s*auto;/);
    assert.match(layout, /data-scroll-behavior="auto"/);
    assert.doesNotMatch(globals, /scroll-behavior:\s*smooth/);
  });

  it("owns reduced-motion and desktop journey through live matchMedia", async () => {
    const [motion, hero, home, globals] = await Promise.all([
      readStorefront("../components/storefront-motion.tsx"),
      readStorefront("../components/home-hero.tsx"),
      readStorefront("../app/page.tsx"),
      readStorefront("../app/globals.css"),
    ]);

    assert.match(motion, /gsap\.matchMedia\(/);
    assert.match(motion, /allowMotion:\s*"\(prefers-reduced-motion: no-preference\)"/);
    assert.match(motion, /reduceMotion:\s*"\(prefers-reduced-motion: reduce\)"/);
    assert.match(motion, /isDesktop:\s*"\(min-width: 1024px\)"/);
    assert.match(motion, /motionMedia\.revert\(/);
    assert.match(motion, /data-motion-ingredient-drift/);
    assert.match(motion, /element\.dataset\.driftX/);
    assert.match(motion, /element\.dataset\.driftY/);
    assert.match(motion, /pin:\s*true/);
    assert.match(motion, /containerAnimation:\s*horizontalTween/);
    assert.match(motion, /anticipatePin:\s*1/);
    assert.doesNotMatch(motion, /data-motion-trust/);
    assert.doesNotMatch(motion, /data-motion-rule/);
    assert.doesNotMatch(motion, /clipPath/);
    assert.doesNotMatch(motion, /Lenis/);

    assert.match(hero, /gsap\.matchMedia\(/);
    assert.match(hero, /prefers-reduced-motion: no-preference/);
    assert.doesNotMatch(hero, /headingRef/);
    assert.match(hero, /attachContinuousMotionGuard\(media, pulse\)/);
    assert.match(hero, /y:\s*-20/);
    assert.match(hero, /y:\s*20/);
    assert.match(hero, /floating \? "overflow-visible" : "overflow-hidden"/);
    assert.match(hero, /perfume-aura-100ml-floating-clean\.webp/);
    assert.doesNotMatch(hero, /perfume-aura-100ml-floating\.png/);
    assert.match(hero, /Show previous featured scent/);
    assert.match(hero, /Show next featured scent/);
    assert.doesNotMatch(hero, /filter:\s*"blur/);
    assert.doesNotMatch(hero, /setInterval|autoplay/i);

    assert.match(home, /data-motion-journey-pin/);
    assert.match(home, /aura-snap-row/);
    assert.match(home, /snap-x snap-mandatory/);
    assert.match(globals, /\[data-motion-journey-track\]/);
    assert.match(globals, /transform:\s*none !important;/);

    const reducedMotion = globals.match(
      /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*)\}\s*$/,
    );
    assert.ok(reducedMotion?.[1], "reduced-motion fallback must exist");
    assert.doesNotMatch(
      reducedMotion[1],
      /\[data-header-logo-(?:icon|wordmark)\]/,
    );
  });

  it("keeps header compact ownership and continuous-motion cleanup seams", async () => {
    const [motion, header, continuous] = await Promise.all([
      readStorefront("../components/storefront-motion.tsx"),
      readStorefront("../components/site-header.tsx"),
      readStorefront("./continuous-motion.ts"),
    ]);

    assert.match(motion, /data-header-logo-icon/);
    assert.match(motion, /data-header-logo-wordmark/);
    assert.match(motion, /attachContinuousMotionGuard\(element, marquee\)/);
    assert.match(header, /data-compact=\{compact \? "true" : "false"\}/);
    assert.match(
      header,
      /window\.scrollY > compactHeaderScrollY\(window\.innerWidth\)/,
    );
    assert.match(motion, /compactHeaderScrollY\(window\.innerWidth\)/);
    assert.match(continuous, /visibilitychange/);
    assert.match(continuous, /mouseenter/);
    assert.match(continuous, /focusin/);
    assert.match(continuous, /removeEventListener/);
  });
});
