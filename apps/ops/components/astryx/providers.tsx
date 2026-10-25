"use client";

import { createContext, use, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { LinkProvider } from "@astryxdesign/core/Link";
import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { themeModeCookie, type ThemeMode } from "@/lib/theme-mode";

const oneYearInSeconds = 60 * 60 * 24 * 365;

const ThemeModeContext = createContext<{
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
} | null>(null);

export function useThemeMode() {
  const context = use(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeMode must be used inside AstryxProviders");
  }
  return context;
}

/** Astryx theme, colour mode and Next.js link routing for every Ops page. */
export function AstryxProviders({
  children,
  initialMode,
}: Readonly<{ children: React.ReactNode; initialMode: ThemeMode }>) {
  const [mode, setModeState] = useState(initialMode);
  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    document.cookie = `${themeModeCookie}=${next}; Path=/; Max-Age=${oneYearInSeconds}; SameSite=Lax; Secure`;
  }, []);
  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return (
    <ThemeModeContext value={value}>
      <Theme theme={neutralTheme} mode={mode}>
        <LinkProvider component={Link}>{children}</LinkProvider>
      </Theme>
    </ThemeModeContext>
  );
}
