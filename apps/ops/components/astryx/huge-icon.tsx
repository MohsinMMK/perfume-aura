import type { SVGProps } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { IconType } from "@astryxdesign/core/Icon";

type HugeIconProps = Omit<SVGProps<SVGSVGElement>, "ref" | "strokeWidth">;

/** Adapts a Hugeicons glyph to the SVG component shape Astryx icon slots accept. */
export function hugeIcon(icon: IconSvgElement): IconType {
  function HugeIcon(props: HugeIconProps) {
    return <HugeiconsIcon icon={icon} strokeWidth={1.75} {...props} />;
  }
  return HugeIcon;
}
