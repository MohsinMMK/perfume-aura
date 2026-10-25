// Lenis smooths wheel input only. Touch, keyboard, scrollbar and assistive
// scrolling stay native, and Lenis itself honours prefers-reduced-motion.
export const smoothScrollQuery =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

export const smoothScrollPreventSelector =
  '[role="dialog"], [role="listbox"], [role="menu"], [data-lenis-prevent]';

type SmoothScrollInstance = Readonly<{
  scrollTo: (
    target: number,
    options: Readonly<{ immediate: boolean; force: boolean }>,
  ) => void;
}>;

let activeInstance: SmoothScrollInstance | null = null;

export function registerSmoothScroll(instance: SmoothScrollInstance | null): void {
  activeInstance = instance;
}

export function isPageScrollLocked(
  html: Readonly<{ style: Readonly<{ overflowY: string }> }>,
  body: Readonly<{ style: Readonly<{ overflowY: string; position: string }> }>,
): boolean {
  return (
    html.style.overflowY === "hidden" ||
    body.style.overflowY === "hidden" ||
    body.style.position === "fixed"
  );
}

// Route and history restoration must land exactly, without inheriting any
// in-flight smoothed wheel momentum.
export function jumpWindowScroll(x: number, y: number): void {
  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  window.scrollTo(x, y);
  activeInstance?.scrollTo(y, { immediate: true, force: true });
  root.style.scrollBehavior = previousScrollBehavior;
}
