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
  LockPasswordIcon,
  ShoppingBag02Icon,
  Settings02Icon,
  StarIcon,
  DeliveryTruck01Icon,
  Tag01Icon,
  CustomerSupportIcon,
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
import { hasOpsCapability, type OpsRole } from "@/lib/ops-access";
import { resetOpsObservabilityUser } from "@/components/observability-user";

const inventoryNav = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardSquare01Icon, capability: "dashboard.view" },
  { href: "/products", label: "Products", icon: Package01Icon, capability: "catalog.view" },
  { href: "/stock", label: "Stock", icon: WarehouseIcon, capability: "stock.view" },
  { href: "/stock/low", label: "Low stock", icon: Alert02Icon, capability: "stock.view" },
  { href: "/finance", label: "Finance", icon: ChartHistogramIcon, capability: "finance.view" },
] as const;

const salesNav = [
  { href: "/customers", label: "Customers", icon: UserGroupIcon, capability: "customers.view" },
  { href: "/invoices", label: "Invoices", icon: File01Icon, capability: "invoices.view" },
  { href: "/invoices/ar", label: "AR", icon: Invoice01Icon, capability: "finance.view" },
  { href: "/payments", label: "Payments", icon: MoneyBag01Icon, capability: "payments.record" },
] as const;

const commerceNav = [
  { href: "/commerce", label: "Commerce", icon: ShoppingBag02Icon, capability: "commerce.view" },
  { href: "/commerce/catalog", label: "Store catalog", icon: Package01Icon, capability: "catalog.view" },
  { href: "/commerce/orders", label: "Orders & delivery", icon: DeliveryTruck01Icon, capability: "commerce.view" },
  { href: "/commerce/promotions", label: "Promotions", icon: Tag01Icon, capability: "commerce.promotions.manage" },
  { href: "/commerce/reviews", label: "Reviews", icon: StarIcon, capability: "commerce.reviews.moderate" },
  { href: "/commerce/support", label: "Support", icon: CustomerSupportIcon, capability: "commerce.support.manage" },
  { href: "/commerce/settings", label: "Checkout gates", icon: Settings02Icon, capability: "commerce.release-gates.manage" },
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
  role,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  lowStockCount?: number;
  role: OpsRole;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await resetOpsObservabilityUser();
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
              {inventoryNav.filter((item) => hasOpsCapability(role, item.capability)).map(({ href, label, icon }) => {
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
              {salesNav.filter((item) => hasOpsCapability(role, item.capability)).map(({ href, label, icon }) => (
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

        <SidebarGroup>
          <SidebarGroupLabel>Storefront</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {commerceNav.filter((item) => hasOpsCapability(role, item.capability)).map(({ href, label, icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={
                      href === "/commerce"
                        ? pathname === href
                        : isActive(pathname, href)
                    }
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
          {hasOpsCapability(role, "security.self") ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={isActive(pathname, "/settings/security")}
                tooltip="Security"
                render={<Link href="/settings/security" />}
              >
                <HugeiconsIcon icon={LockPasswordIcon} strokeWidth={2} />
                <span>Security</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
          {hasOpsCapability(role, "security.staff.manage") ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={isActive(pathname, "/settings/staff")}
                tooltip="Staff access"
                render={<Link href="/settings/staff" />}
              >
                <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
                <span>Staff access</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign out" onClick={handleSignOut}>
              <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <p className="px-2 pb-1 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          Inventory + finance + commerce
        </p>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
