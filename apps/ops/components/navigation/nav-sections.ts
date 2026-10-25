import {
  Alert02Icon,
  Analytics01Icon,
  ChartHistogramIcon,
  CustomerSupportIcon,
  DashboardSquare01Icon,
  DeliveryTruck01Icon,
  DropletIcon,
  File01Icon,
  Invoice01Icon,
  Layers01Icon,
  MoneyBag01Icon,
  Package01Icon,
  PackageOpenIcon,
  Settings02Icon,
  ShoppingBag02Icon,
  StarIcon,
  Store01Icon,
  Tag01Icon,
  UserGroupIcon,
  WarehouseIcon,
} from "@hugeicons/core-free-icons";
import type { IconType } from "@astryxdesign/core/Icon";
import { hugeIcon } from "@/components/astryx/huge-icon";
import {
  hasOpsCapability,
  type OpsCapability,
  type OpsRole,
} from "@/lib/ops-access";

export type NavSectionId = "inventory" | "sales" | "storefront";

export type NavItem = {
  href: string;
  label: string;
  icon: IconType;
  capability: OpsCapability;
};

export type NavSection = {
  id: NavSectionId;
  title: string;
  icon: IconType;
  items: readonly NavItem[];
};

const sections: readonly NavSection[] = [
  {
    id: "inventory",
    title: "Inventory",
    icon: hugeIcon(WarehouseIcon),
    items: [
      { href: "/dashboard", label: "Dashboard", icon: hugeIcon(DashboardSquare01Icon), capability: "dashboard.view" },
      { href: "/products", label: "Products", icon: hugeIcon(Package01Icon), capability: "catalog.view" },
      { href: "/series", label: "Series", icon: hugeIcon(Layers01Icon), capability: "catalog.view" },
      { href: "/stock", label: "Stock", icon: hugeIcon(WarehouseIcon), capability: "stock.view" },
      { href: "/stock/oil", label: "Oil stock", icon: hugeIcon(DropletIcon), capability: "stock.view" },
      { href: "/stock/supplies", label: "Supplies", icon: hugeIcon(PackageOpenIcon), capability: "stock.view" },
      { href: "/stock/low", label: "Low stock", icon: hugeIcon(Alert02Icon), capability: "stock.view" },
      { href: "/finance", label: "Finance", icon: hugeIcon(ChartHistogramIcon), capability: "finance.view" },
      { href: "/reports", label: "Reports", icon: hugeIcon(Analytics01Icon), capability: "finance.view" },
    ],
  },
  {
    id: "sales",
    title: "Sales",
    icon: hugeIcon(ShoppingBag02Icon),
    items: [
      { href: "/sales/new", label: "New sale", icon: hugeIcon(ShoppingBag02Icon), capability: "sales.complete" },
      { href: "/customers", label: "Customers", icon: hugeIcon(UserGroupIcon), capability: "customers.view" },
      { href: "/invoices", label: "Invoices", icon: hugeIcon(File01Icon), capability: "invoices.view" },
      { href: "/invoices/ar", label: "AR", icon: hugeIcon(Invoice01Icon), capability: "finance.view" },
      { href: "/payments", label: "Payments", icon: hugeIcon(MoneyBag01Icon), capability: "payments.record" },
    ],
  },
  {
    id: "storefront",
    title: "Storefront",
    icon: hugeIcon(Store01Icon),
    items: [
      { href: "/commerce", label: "Commerce", icon: hugeIcon(ShoppingBag02Icon), capability: "commerce.view" },
      { href: "/commerce/catalog", label: "Store catalog", icon: hugeIcon(Package01Icon), capability: "catalog.view" },
      { href: "/commerce/orders", label: "Orders & delivery", icon: hugeIcon(DeliveryTruck01Icon), capability: "commerce.view" },
      { href: "/commerce/promotions", label: "Promotions", icon: hugeIcon(Tag01Icon), capability: "commerce.promotions.manage" },
      { href: "/commerce/reviews", label: "Reviews", icon: hugeIcon(StarIcon), capability: "commerce.reviews.moderate" },
      { href: "/commerce/support", label: "Support", icon: hugeIcon(CustomerSupportIcon), capability: "commerce.support.manage" },
      { href: "/commerce/settings", label: "Checkout gates", icon: hugeIcon(Settings02Icon), capability: "commerce.release-gates.manage" },
    ],
  },
];

/** Sections and destinations this role may open; empty sections are dropped. */
export function navSectionsForRole(role: OpsRole): NavSection[] {
  return sections.flatMap((section) => {
    const items = section.items.filter((item) =>
      hasOpsCapability(role, item.capability),
    );
    return items.length > 0 ? [{ ...section, items }] : [];
  });
}

export function isNavItemActive(pathname: string, href: string) {
  if (href === "/stock") return pathname === "/stock";
  if (href === "/commerce") return pathname === "/commerce";
  if (href === "/invoices") {
    return (
      pathname === "/invoices" ||
      (pathname.startsWith("/invoices/") && !pathname.startsWith("/invoices/ar"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The section whose destination matches the current route, if any. */
export function navSectionForPath(
  sectionList: readonly NavSection[],
  pathname: string,
): NavSection | undefined {
  return sectionList.find((section) =>
    section.items.some((item) => isNavItemActive(pathname, item.href)),
  );
}
