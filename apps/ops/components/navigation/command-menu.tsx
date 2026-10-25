"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CommandPalette } from "@astryxdesign/core/CommandPalette";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { createStaticSource } from "@astryxdesign/core/Typeahead";
import type { IconType } from "@astryxdesign/core/Icon";
import type { NavSection } from "@/components/navigation/nav-sections";

type PageCommand = {
  id: string;
  label: string;
  auxiliaryData: { group: string; icon: IconType };
};

/** ⌘K / Ctrl+K page search over every destination this role can open. */
export function CommandMenu({
  sections,
  extraPages,
  isOpen,
  onOpenChange,
}: {
  sections: readonly NavSection[];
  extraPages: readonly { href: string; label: string; icon: IconType }[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const router = useRouter();
  const searchSource = useMemo(() => {
    const commands: PageCommand[] = [
      ...sections.flatMap((section) =>
        section.items.map((item) => ({
          id: item.href,
          label: item.label,
          auxiliaryData: { group: section.title, icon: item.icon },
        })),
      ),
      ...extraPages.map((page) => ({
        id: page.href,
        label: page.label,
        auxiliaryData: { group: "Account", icon: page.icon },
      })),
    ];
    return createStaticSource(commands);
  }, [sections, extraPages]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange]);

  return (
    <CommandPalette
      label="Go to a page"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      searchSource={searchSource}
      emptySearchText="No matching pages"
      renderItem={(item) => (
        <HStack gap={3} vAlign="center">
          <Icon icon={item.auxiliaryData.icon} size="sm" color="secondary" />
          <Text>{item.label}</Text>
        </HStack>
      )}
      onValueChange={(href) => {
        onOpenChange(false);
        router.push(href);
      }}
    />
  );
}
