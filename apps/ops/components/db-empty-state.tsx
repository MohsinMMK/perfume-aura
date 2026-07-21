import Link from "next/link";
import { buttonVariants } from "@perfume-aura/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@perfume-aura/ui/components/empty";
import { cn } from "@perfume-aura/ui/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  DatabaseIcon,
  Package01Icon,
} from "@hugeicons/core-free-icons";

type DbUnavailableProps = {
  message?: string;
};

/** Official Empty composition for DB / connection failures. */
export function DbUnavailableState({
  message = "Database is not ready.",
}: DbUnavailableProps) {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={DatabaseIcon} strokeWidth={2} />
        </EmptyMedia>
        <EmptyTitle>Database unavailable</EmptyTitle>
        <EmptyDescription>
          {message} Set{" "}
          <code className="text-foreground">DATABASE_URL</code>, run migrations,
          seed MAIN location, then refresh.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

type CatalogEmptyProps = {
  title?: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
};

/** Official Empty for empty product catalog. */
export function CatalogEmptyState({
  title = "No products yet",
  description = "Add your first fragrance to start tracking stock.",
  actionHref = "/products/new",
  actionLabel = "Create product",
}: CatalogEmptyProps) {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={Package01Icon} strokeWidth={2} />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link href={actionHref} className={cn(buttonVariants())}>
          {actionLabel}
        </Link>
      </EmptyContent>
    </Empty>
  );
}

/** Official Empty when low-stock list is clear. */
export function LowStockClearState() {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
        </EmptyMedia>
        <EmptyTitle>All clear</EmptyTitle>
        <EmptyDescription>
          No active variants are at or below their reorder threshold.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link
          href="/stock"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Receive stock
        </Link>
      </EmptyContent>
    </Empty>
  );
}
