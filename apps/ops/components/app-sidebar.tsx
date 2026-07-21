"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  DashboardSquare01Icon,
  File01Icon,
  Logout01Icon,
  ChartHistogramIcon,
  MoneyBag01Icon,
  Package01Icon,
  UserGroupIcon,
  WarehouseIcon,
  Invoice01Icon,
} from "@hugeicons/core-free-icons";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@perfume-aura/ui/components/sidebar";
import { signOut } from "@/lib/auth-client";

const inventoryNav = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardSquare01Icon },
  { href: "/products", label: "Products", icon: Package01Icon },
  { href: "/stock", label: "Stock", icon: WarehouseIcon },
  { href: "/stock/low", label: "Low stock", icon: Alert02Icon },
  { href: "/finance", label: "Finance", icon: ChartHistogramIcon },
] as const;

const salesNav = [
  { href: "/customers", label: "Customers", icon: UserGroupIcon },
  { href: "/invoices", label: "Invoices", icon: File01Icon },
  { href: "/invoices/ar", label: "AR", icon: Invoice01Icon },
  { href: "/payments", label: "Payments", icon: MoneyBag01Icon },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/stock") return pathname === "/stock";
  if (href === "/invoices") {
    return (
      pathname === "/invoices" ||
      (pathname.startsWith("/invoices/") && !pathname.startsWith("/invoices/ar"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Official shadcn Sidebar composition (base-luma / Hugeicons).
 */
export function AppSidebar({
  lowStockCount = 0,
  ...props
}: React.ComponentProps<typeof Sidebar> & { lowStockCount?: number }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/dashboard" />}
              tooltip="Perfume Aura Ops"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <span className="text-xs font-semibold">PA</span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Perfume Aura</span>
                <span className="truncate text-xs text-muted-foreground">
                  Ops · inventory + sales
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Inventory</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {inventoryNav.map(({ href, label, icon }) => {
                const active = isActive(pathname, href);
                const showBadge = href === "/stock/low" && lowStockCount > 0;
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={
                        showBadge ? `${label} (${lowStockCount})` : label
                      }
                      render={<Link href={href} />}
                    >
                      <HugeiconsIcon icon={icon} strokeWidth={2} />
                      <span>{label}</span>
                    </SidebarMenuButton>
                    {showBadge ? (
                      <SidebarMenuBadge className="bg-destructive/15 text-destructive">
                        {lowStockCount > 99 ? "99+" : lowStockCount}
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sales</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {salesNav.map(({ href, label, icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={isActive(pathname, href)}
                    tooltip={label}
                    render={<Link href={href} />}
                  >
                    <HugeiconsIcon icon={icon} strokeWidth={2} />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign out" onClick={handleSignOut}>
              <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <p className="px-2 pb-1 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          Phase 3 · Inventory + sales + payments
        </p>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
