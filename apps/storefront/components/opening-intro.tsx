"use client";

import { useEffect, useState } from "react";

const introSessionKey = "perfume-aura-intro-seen";

export function OpeningIntro() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || window.sessionStorage.getItem(introSessionKey)) return;

    window.sessionStorage.setItem(introSessionKey, "true");
    const showTimeoutId = window.setTimeout(() => setVisible(true), 0);
    const timeoutId = window.setTimeout(() => setVisible(false), 1_150);
    return () => {
      window.clearTimeout(showTimeoutId);
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="opening-intro" aria-hidden="true">
      <p>Perfume Aura</p>
    </div>
  );
}
