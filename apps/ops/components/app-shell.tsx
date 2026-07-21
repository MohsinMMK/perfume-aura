"use client";

import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@perfume-aura/ui/components/sidebar";
import { Separator } from "@perfume-aura/ui/components/separator";

/**
 * Official shadcn app shell: SidebarProvider + Sidebar + SidebarInset.
 * Mobile drawer is built into Sidebar; trigger lives in the inset header.
 */
export function AppShell({
  children,
  lowStockCount = 0,
}: {
  children: React.ReactNode;
  /** Active low-stock SKU count for nav badge (FR-INV-7 day-to-day alert). */
  lowStockCount?: number;
}) {
  return (
    <SidebarProvider>
      <AppSidebar lowStockCount={lowStockCount} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 md:px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <span className="truncate text-sm font-medium tracking-tight">
            Perfume Aura Ops
          </span>
          {lowStockCount > 0 ? (
            <Link
              href="/stock/low"
              className="ml-auto truncate text-xs font-medium text-destructive underline-offset-4 hover:underline"
            >
              {lowStockCount} low stock
            </Link>
          ) : null}
        </header>
        <div className="flex flex-1 flex-col p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
