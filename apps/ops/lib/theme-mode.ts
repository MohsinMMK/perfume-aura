export const themeModes = ["system", "light", "dark"] as const;

export type ThemeMode = (typeof themeModes)[number];

/** Cookie that carries the Ops colour-mode preference so the server renders it. */
export const themeModeCookie = "ops-theme-mode";

export function parseThemeMode(value: string | undefined): ThemeMode {
  return themeModes.find((mode) => mode === value) ?? "system";
}
