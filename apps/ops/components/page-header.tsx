import type { ReactNode } from "react";
import { HStack } from "@astryxdesign/core/HStack";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** Page-level actions, such as an Astryx Button with an href. */
  actions?: ReactNode;
};

/** The heading row every Ops page starts with. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <HStack justify="between" align="end" gap={4} wrap="wrap">
      <VStack gap={1}>
        <Heading level={1}>{title}</Heading>
        {description ? (
          <Text as="p" color="secondary">
            {description}
          </Text>
        ) : null}
      </VStack>
      {actions ? (
        <HStack gap={2} wrap="wrap">
          {actions}
        </HStack>
      ) : null}
    </HStack>
  );
}
