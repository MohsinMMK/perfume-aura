// Geometry and fade for the homepage "why Perfume Aura" arc. Kept free of DOM
// and GSAP so the arithmetic can be unit tested.

// Matches the `--aura-arc-step` fallback in globals.css.
export const defaultArcStepDegrees = 24;

const fallbackRemPx = 16;
const minimumItemOpacity = 0.16;
const opacityFalloffPerStep = 0.72;

export type ArcGeometry = Readonly<{
  itemWidth: number;
  radius: number;
  stepDegrees: number;
}>;

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * Returns null while the section has no measurable width (detached, hidden or
 * zero-size viewport). A zero item width would make the step angle 0, and
 * every later `distance / stepDegrees` division would be 0/0 = NaN, so callers
 * keep their previous geometry until a real layout is available.
 */
export function arcGeometry(
  width: number,
  remPx: number,
  isMobile: boolean,
): ArcGeometry | null {
  if (!isPositiveFinite(width)) return null;
  const rem = isPositiveFinite(remPx) ? remPx : fallbackRemPx;
  const itemWidth = Math.min(28 * rem, width * 0.82);
  const radius = Math.max(width * (isMobile ? 1.7 : 0.95), 40 * rem);
  const stepDegrees = ((itemWidth * 1.3) / radius) * (180 / Math.PI);
  return isPositiveFinite(stepDegrees) ? { itemWidth, radius, stepDegrees } : null;
}

/**
 * Opacity for the item at `index` when the wheel is rotated by `rotation`
 * degrees: 1 at the centred step, fading to a floor for distant steps. Always
 * a finite number in [0.16, 1].
 */
export function arcItemOpacity(
  index: number,
  rotation: number,
  stepDegrees: number,
): number {
  if (!isPositiveFinite(stepDegrees)) return 1;
  const safeRotation = Number.isFinite(rotation) ? rotation : 0;
  const distance = Math.abs(index * stepDegrees + safeRotation) / stepDegrees;
  const opacity = 1 - distance * opacityFalloffPerStep;
  return Math.min(1, Math.max(minimumItemOpacity, opacity));
}
