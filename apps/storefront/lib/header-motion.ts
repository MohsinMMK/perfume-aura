const mobileHeaderBreakpoint = 640;
const mobileCompactScrollY = 96;
const desktopCompactScrollY = 40;

export function compactHeaderScrollY(viewportWidth: number): number {
  return viewportWidth < mobileHeaderBreakpoint
    ? mobileCompactScrollY
    : desktopCompactScrollY;
}
