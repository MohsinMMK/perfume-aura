"use client";

import { Tab, TabList } from "@astryxdesign/core/TabList";

export type FilterTab = { value: string; label: string; href: string };

/**
 * Link tabs for a list page's URL filter. Each tab navigates, so the strip is
 * a `<nav>` that marks the shown filter with `aria-current`.
 */
export function FilterTabs({
  label,
  tabs,
  value,
}: {
  label: string;
  tabs: readonly FilterTab[];
  value: string;
}) {
  return (
    <TabList
      aria-label={label}
      value={value}
      // Tabs carry an href, so the router handles the change.
      onChange={() => {}}
      hasDivider
      className="min-w-0 pointer-coarse:[&_a]:min-h-11"
    >
      {tabs.map((tab) => (
        <Tab key={tab.value} value={tab.value} label={tab.label} href={tab.href} />
      ))}
    </TabList>
  );
}
