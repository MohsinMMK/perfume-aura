"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const focusedAccountRoutes = new Set([
  "/account/sign-in",
  "/account/register",
  "/account/recover",
]);

export function StorefrontRouteChrome({
  children,
}: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();

  return focusedAccountRoutes.has(pathname) ? null : children;
}
