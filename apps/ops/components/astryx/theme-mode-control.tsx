"use client";

import { ComputerIcon, Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@astryxdesign/core/Icon";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { hugeIcon } from "@/components/astryx/huge-icon";
import { useThemeMode } from "@/components/astryx/providers";
import { parseThemeMode } from "@/lib/theme-mode";

const lightIcon = hugeIcon(Sun03Icon);
const darkIcon = hugeIcon(Moon02Icon);
const systemIcon = hugeIcon(ComputerIcon);

/**
 * Light, dark or follow-the-system colour mode for this browser. `hasLabels`
 * swaps the icons for each mode's name and stretches the control to its
 * container, so all three names fit a sidebar-wide menu.
 */
export function ThemeModeControl({ hasLabels = false }: { hasLabels?: boolean }) {
  const { mode, setMode } = useThemeMode();
  const isLabelHidden = !hasLabels;
  return (
    <SegmentedControl
      label="Colour mode"
      size="sm"
      layout={hasLabels ? "fill" : "hug"}
      value={mode}
      onChange={(value) => setMode(parseThemeMode(value))}
    >
      <SegmentedControlItem value="light" label="Light" isLabelHidden={isLabelHidden} icon={hasLabels ? undefined : <Icon icon={lightIcon} />} />
      <SegmentedControlItem value="dark" label="Dark" isLabelHidden={isLabelHidden} icon={hasLabels ? undefined : <Icon icon={darkIcon} />} />
      <SegmentedControlItem value="system" label="System" isLabelHidden={isLabelHidden} icon={hasLabels ? undefined : <Icon icon={systemIcon} />} />
    </SegmentedControl>
  );
}
