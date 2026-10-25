"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LockPasswordIcon,
  Logout01Icon,
  UnfoldMoreIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Popover } from "@astryxdesign/core/Popover";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { hugeIcon } from "@/components/astryx/huge-icon";
import { ThemeModeControl } from "@/components/astryx/theme-mode-control";
import { resetOpsObservabilityUser } from "@/components/observability-user";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import { hasOpsCapability, type OpsRole } from "@/lib/ops-access";

const securityIcon = hugeIcon(LockPasswordIcon);
const staffIcon = hugeIcon(UserGroupIcon);
const signOutIcon = hugeIcon(Logout01Icon);
const expandIcon = hugeIcon(UnfoldMoreIcon);

const roleLabels: Record<OpsRole, string> = {
  owner: "Owner",
  staff: "Staff",
  user: "User",
};

/** Width the popover takes when the sidebar is collapsed to icons. */
const collapsedMenuWidth = 280;

export type OpsAccount = {
  name: string;
  email: string;
  role: OpsRole;
};

/**
 * Sidebar footer account button. Its popover opens above it at the button's
 * own width, so it stays inside the sidebar with the footer's side gaps.
 */
export function AccountMenu({
  account,
  isCollapsed,
}: {
  account: OpsAccount;
  isCollapsed: boolean;
}) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [menuWidth, setMenuWidth] = useState(collapsedMenuWidth);
  const displayName = account.name.trim() || account.email;

  function handleOpenChange(next: boolean) {
    if (next) {
      const triggerWidth = triggerRef.current?.offsetWidth ?? 0;
      setMenuWidth(isCollapsed ? collapsedMenuWidth : Math.max(triggerWidth, 220));
    }
    setIsOpen(next);
  }

  async function handleSignOut() {
    await resetOpsObservabilityUser();
    await signOut();
    router.push("/login");
    router.refresh();
  }

  const content = (
    <VStack gap={3}>
      <HStack gap={3} vAlign="center">
        <Avatar name={displayName} size="md" tooltip={false} />
        <VStack gap={0.5} className="min-w-0">
          <Text weight="semibold" maxLines={1}>
            {displayName}
          </Text>
          <Text type="supporting" maxLines={1}>
            {account.email}
          </Text>
        </VStack>
      </HStack>
      <HStack gap={2} vAlign="center" justify="between">
        <Text type="supporting">Role</Text>
        <Token size="sm" color={account.role === "owner" ? "purple" : "blue"} label={roleLabels[account.role]} />
      </HStack>
      <Divider />
      <VStack gap={2}>
        <Text type="label">Appearance</Text>
        <ThemeModeControl hasLabels />
      </VStack>
      <Divider />
      <VStack gap={1}>
        {hasOpsCapability(account.role, "security.self") ? (
          <Button
            label="Security"
            href="/settings/security"
            variant="ghost"
            width="100%"
            icon={<Icon icon={securityIcon} />}
            onClick={() => setIsOpen(false)}
            className="justify-start"
          />
        ) : null}
        {hasOpsCapability(account.role, "security.staff.manage") ? (
          <Button
            label="Staff access"
            href="/settings/staff"
            variant="ghost"
            width="100%"
            icon={<Icon icon={staffIcon} />}
            onClick={() => setIsOpen(false)}
            className="justify-start"
          />
        ) : null}
        <Button
          label="Sign out"
          variant="ghost"
          width="100%"
          icon={<Icon icon={signOutIcon} />}
          clickAction={handleSignOut}
          className="justify-start"
        />
      </VStack>
    </VStack>
  );

  return (
    <Popover
      label="Account"
      placement={isCollapsed ? "end" : "above"}
      alignment={isCollapsed ? "end" : "start"}
      width={menuWidth}
      padding={4}
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      content={content}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Account: ${displayName}`}
        className={cn(
          "flex min-h-11 w-full items-center gap-3 rounded-lg text-start transition-colors",
          "hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-outline-color)]",
          isCollapsed ? "justify-center p-1" : "px-2 py-1.5",
        )}
      >
        <Avatar name={displayName} size="sm" tooltip={false} />
        {isCollapsed ? null : (
          <>
            <span className="flex min-w-0 flex-1 flex-col">
              <Text weight="medium" size="sm" maxLines={1} hasTruncateTooltip={false}>
                {displayName}
              </Text>
              <Text type="supporting" size="xsm" maxLines={1} hasTruncateTooltip={false}>
                {account.email}
              </Text>
            </span>
            <Icon icon={expandIcon} size="sm" color="secondary" />
          </>
        )}
      </button>
    </Popover>
  );
}
