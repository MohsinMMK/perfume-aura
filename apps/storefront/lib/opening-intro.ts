// The homepage opening plays once per browser session, never under reduced
// motion, and never without JavaScript: the server renders it hidden and a
// pre-paint gate opts in. A CSS failsafe hides it even if hydration fails.
export const openingIntroSessionKey = "pa_opening_intro_seen";
export const openingIntroEndEvent = "aura:opening-intro-end";
export const openingIntroPlayingSelector =
  '[data-opening-intro][data-state="play"]';

export const openingIntroGateScript = `(function(){try{var e=document.querySelector("[data-opening-intro]");if(!e||window.matchMedia("(prefers-reduced-motion: reduce)").matches||window.sessionStorage.getItem("${openingIntroSessionKey}"))return;window.sessionStorage.setItem("${openingIntroSessionKey}","1");e.setAttribute("data-state","play")}catch(t){}})();`;

export function isOpeningIntroPlaying(): boolean {
  return document.querySelector(openingIntroPlayingSelector) !== null;
}

// Runs `callback` once the opening has handed the page over, immediately when
// no opening is playing. Returns a cleanup for effects that unmount first.
export function afterOpeningIntro(callback: () => void): () => void {
  if (!isOpeningIntroPlaying()) {
    callback();
    return () => {};
  }

  const handleEnd = () => callback();
  window.addEventListener(openingIntroEndEvent, handleEnd, { once: true });
  return () => window.removeEventListener(openingIntroEndEvent, handleEnd);
}
