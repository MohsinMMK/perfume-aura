"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PerfumeIcon,
  Search01Icon,
  SidebarLeftIcon,
} from "@hugeicons/core-free-icons";
import { useAppShellMobile } from "@astryxdesign/core/AppShell";
import { Badge } from "@astryxdesign/core/Badge";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { NavIcon } from "@astryxdesign/core/NavIcon";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import {
  SideNav,
  SideNavCollapseButton,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
  useSideNavRenderMode,
} from "@astryxdesign/core/SideNav";
import { ToggleButton } from "@astryxdesign/core/ToggleButton";
import { hugeIcon } from "@/components/astryx/huge-icon";
import { AccountMenu, type OpsAccount } from "@/components/navigation/account-menu";
import {
  isNavItemActive,
  type NavSection,
  type NavSectionId,
} from "@/components/navigation/nav-sections";
import { cn } from "@/lib/cn";

const brandIcon = hugeIcon(PerfumeIcon);
const searchIcon = hugeIcon(Search01Icon);
const collapseIcon = hugeIcon(SidebarLeftIcon);

type AppSidebarProps = {
  sections: readonly NavSection[];
  activeSectionId: NavSectionId | undefined;
  onSelectSection: (id: NavSectionId) => void;
  isCollapsed: boolean;
  onCollapsedChange: (isCollapsed: boolean) => void;
  onOpenSearch: () => void;
  lowStockCount: number;
  account: OpsAccount;
};

function lowStockLabel(count: number) {
  return count > 99 ? "99+" : count;
}

function SectionItems({
  section,
  lowStockCount,
}: {
  section: NavSection;
  lowStockCount: number;
}) {
  const pathname = usePathname();
  return (
    <SideNavSection title={section.title}>
      {section.items.map(({ href, label, icon }) => (
        <SideNavItem
          key={href}
          label={label}
          href={href}
          icon={icon}
          isSelected={isNavItemActive(pathname, href)}
          endContent={
            href === "/stock/low" && lowStockCount > 0 ? (
              <Badge variant="error" label={lowStockLabel(lowStockCount)} />
            ) : undefined
          }
        />
      ))}
    </SideNavSection>
  );
}

const heading = (
  <SideNavHeading
    heading="Perfume Aura"
    subheading="Operations"
    headingHref="/dashboard"
  />
);

/**
 * Ops navigation. On wide screens a section rail stays visible beside a
 * SideNav that lists only the chosen section and collapses to icons. On
 * narrow screens AppShell moves the SideNav into its drawer, where a
 * segmented control switches sections instead of the rail.
 */
export function AppSidebar({
  sections,
  activeSectionId,
  onSelectSection,
  isCollapsed,
  onCollapsedChange,
  onOpenSearch,
  lowStockCount,
  account,
}: AppSidebarProps) {
  const { isMobile } = useAppShellMobile();
  const renderMode = useSideNavRenderMode();
  const activeSection =
    sections.find((section) => section.id === activeSectionId) ?? sections[0];
  const items = activeSection ? (
    <SectionItems section={activeSection} lowStockCount={lowStockCount} />
  ) : null;
  const searchButton = (
    <IconButton
      label="Search pages"
      tooltip="Search pages (⌘K)"
      variant="ghost"
      icon={<Icon icon={searchIcon} />}
      onClick={onOpenSearch}
    />
  );

  if (isMobile) {
    return (
      <SideNav
        header={heading}
        topContent={
          sections.length > 1 && activeSection ? (
            <SegmentedControl
              label="Navigation section"
              size="sm"
              layout="fill"
              value={activeSection.id}
              onChange={(value) => {
                const next = sections.find((section) => section.id === value);
                if (next) onSelectSection(next.id);
              }}
            >
              {sections.map((section) => (
                <SegmentedControlItem
                  key={section.id}
                  value={section.id}
                  label={section.title}
                />
              ))}
            </SegmentedControl>
          ) : undefined
        }
        footer={<AccountMenu account={account} isCollapsed={false} />}
        // The narrow top bar already offers search; the drawer does not repeat it.
        footerIcons={renderMode === "topbar" ? searchButton : undefined}
      >
        {items}
      </SideNav>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <div
        role="group"
        aria-label="Navigation sections"
        className="flex w-16 shrink-0 flex-col items-center gap-2 border-e border-border py-3"
      >
        <Link
          href="/dashboard"
          aria-label="Perfume Aura dashboard"
          className="mb-2 flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-outline-color)]"
        >
          <NavIcon icon={<Icon icon={brandIcon} />} />
        </Link>
        {sections.map((section) => {
          const alertCount = section.id === "inventory" ? lowStockCount : 0;
          return (
            <span key={section.id} className="relative">
              <ToggleButton
                label={
                  alertCount > 0
                    ? `${section.title}, ${alertCount} low stock`
                    : section.title
                }
                tooltip={section.title}
                isIconOnly
                icon={<Icon icon={section.icon} />}
                isPressed={section.id === activeSection?.id && !isCollapsed}
                onPressedChange={() => onSelectSection(section.id)}
              />
              {alertCount > 0 ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute end-0.5 top-0.5 size-2 rounded-full bg-error ring-2 ring-[var(--color-background-wash)]"
                />
              ) : null}
            </span>
          );
        })}
        <span className="mt-auto">{searchButton}</span>
      </div>
      <SideNav
        className="min-w-0"
        collapsible={{
          isCollapsed,
          onCollapsedChange,
          hasButton: false,
        }}
        header={
          <div
            className={cn(
              "flex min-w-0 items-center gap-1",
              isCollapsed && "justify-center",
            )}
          >
            <SideNavCollapseButton
              collapsible={{ isCollapsed, onCollapsedChange }}
              label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Icon icon={collapseIcon} />
            </SideNavCollapseButton>
            {heading}
          </div>
        }
        footer={<AccountMenu account={account} isCollapsed={isCollapsed} />}
      >
        {items}
      </SideNav>
    </div>
  );
}
