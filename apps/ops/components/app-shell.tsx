"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { LockPasswordIcon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { AppShell as AstryxAppShell } from "@astryxdesign/core/AppShell";
import { AppSidebar } from "@/components/app-sidebar";
import { hugeIcon } from "@/components/astryx/huge-icon";
import type { OpsAccount } from "@/components/navigation/account-menu";
import { CommandMenu } from "@/components/navigation/command-menu";
import {
  navSectionForPath,
  navSectionsForRole,
  type NavSectionId,
} from "@/components/navigation/nav-sections";
import { navCollapsedCookie } from "@/lib/nav-preferences";
import { hasOpsCapability } from "@/lib/ops-access";

const oneYearInSeconds = 60 * 60 * 24 * 365;

/**
 * Astryx frame: section rail + collapsible SideNav on wide screens, AppShell's
 * generated top bar and drawer on narrow ones, and a ⌘K page search.
 */
export function AppShell({
  children,
  lowStockCount = 0,
  account,
  defaultNavCollapsed = false,
}: {
  children: React.ReactNode;
  /** Active low-stock SKU count for nav badge (FR-INV-7 day-to-day alert). */
  lowStockCount?: number;
  account: OpsAccount;
  defaultNavCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const { role } = account;
  const sections = useMemo(() => navSectionsForRole(role), [role]);
  const accountPages = useMemo(
    () => [
      ...(hasOpsCapability(role, "security.self")
        ? [{ href: "/settings/security", label: "Security", icon: hugeIcon(LockPasswordIcon) }]
        : []),
      ...(hasOpsCapability(role, "security.staff.manage")
        ? [{ href: "/settings/staff", label: "Staff access", icon: hugeIcon(UserGroupIcon) }]
        : []),
    ],
    [role],
  );

  // A section picked from the rail holds until the route changes; then the
  // section that owns the new route takes over.
  const [picked, setPicked] = useState<{ id: NavSectionId; pathname: string } | null>(null);
  const activeSectionId =
    picked?.pathname === pathname
      ? picked.id
      : navSectionForPath(sections, pathname)?.id;

  const [isNavCollapsed, setIsNavCollapsed] = useState(defaultNavCollapsed);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  function updateNavCollapsed(next: boolean) {
    setIsNavCollapsed(next);
    document.cookie = `${navCollapsedCookie}=${next ? "1" : "0"}; Path=/; Max-Age=${oneYearInSeconds}; SameSite=Lax; Secure`;
  }

  function selectSection(id: NavSectionId) {
    const shownId = activeSectionId ?? sections[0]?.id;
    if (id === shownId && !isNavCollapsed) {
      updateNavCollapsed(true);
      return;
    }
    setPicked({ id, pathname });
    if (isNavCollapsed) updateNavCollapsed(false);
  }

  return (
    <>
      <AstryxAppShell
        contentPadding={6}
        sideNav={
          <AppSidebar
            sections={sections}
            activeSectionId={activeSectionId}
            onSelectSection={selectSection}
            isCollapsed={isNavCollapsed}
            onCollapsedChange={updateNavCollapsed}
            onOpenSearch={() => setIsSearchOpen(true)}
            lowStockCount={lowStockCount}
            account={account}
          />
        }
      >
        {children}
      </AstryxAppShell>
      <CommandMenu
        sections={sections}
        extraPages={accountPages}
        isOpen={isSearchOpen}
        onOpenChange={setIsSearchOpen}
      />
    </>
  );
}
