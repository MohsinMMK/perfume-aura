export type ContinuousMotionIdleState = Readonly<{
  hidden: boolean;
  hovered: boolean;
  focusWithin: boolean;
}>;

export function shouldResumeContinuousMotion(
  state: ContinuousMotionIdleState,
): boolean {
  return !state.hidden && !state.hovered && !state.focusWithin;
}

export function attachContinuousMotionGuard(
  element: HTMLElement,
  animation: Readonly<{
    pause: () => void;
    resume: () => void;
  }>,
): () => void {
  let pendingFocusOutFrame: number | null = null;

  const readState = (): ContinuousMotionIdleState => ({
    hidden: document.hidden,
    hovered: element.matches(":hover"),
    focusWithin: element.matches(":focus-within"),
  });

  const pause = () => {
    animation.pause();
  };

  const handleFocusIn = () => {
    if (pendingFocusOutFrame !== null) {
      window.cancelAnimationFrame(pendingFocusOutFrame);
      pendingFocusOutFrame = null;
    }
    pause();
  };

  const resumeWhenIdle = () => {
    if (shouldResumeContinuousMotion(readState())) {
      animation.resume();
    }
  };

  const handleFocusOut = (event: FocusEvent) => {
    const nextTarget = event.relatedTarget;
    if (!(nextTarget instanceof Node) || !element.contains(nextTarget)) {
      pendingFocusOutFrame = window.requestAnimationFrame(() => {
        pendingFocusOutFrame = null;
        resumeWhenIdle();
      });
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) pause();
    else resumeWhenIdle();
  };

  element.addEventListener("mouseenter", pause);
  element.addEventListener("mouseleave", resumeWhenIdle);
  element.addEventListener("focusin", handleFocusIn);
  element.addEventListener("focusout", handleFocusOut);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  if (!shouldResumeContinuousMotion(readState())) {
    pause();
  }

  return () => {
    element.removeEventListener("mouseenter", pause);
    element.removeEventListener("mouseleave", resumeWhenIdle);
    element.removeEventListener("focusin", handleFocusIn);
    element.removeEventListener("focusout", handleFocusOut);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    if (pendingFocusOutFrame !== null) {
      window.cancelAnimationFrame(pendingFocusOutFrame);
    }
  };
}
