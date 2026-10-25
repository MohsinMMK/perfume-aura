/** Cookie that remembers a collapsed Ops sidebar so the server renders it collapsed. */
export const navCollapsedCookie = "ops-nav-collapsed";

export function parseNavCollapsed(value: string | undefined): boolean {
  return value === "1";
}
