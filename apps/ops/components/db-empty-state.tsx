import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import {
  Alert02Icon,
  DatabaseIcon,
  Package01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

/** EmptyState art; a plain SVG element so server pages can render it. */
function emptyIcon(icon: IconSvgElement) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={32}
      strokeWidth={1.75}
      className="text-secondary"
    />
  );
}

type DbUnavailableProps = {
  message?: string;
};

/** Astryx EmptyState for DB / connection failures. */
export function DbUnavailableState({
  message = "Database is not ready.",
}: DbUnavailableProps) {
  return (
    <Card variant="muted">
      <EmptyState
        icon={emptyIcon(DatabaseIcon)}
        title="Database unavailable"
        description={`${message} Set DATABASE_URL, run migrations, seed MAIN location, then refresh.`}
      />
    </Card>
  );
}

type CatalogEmptyProps = {
  /** Only staff who may create products get the create action. */
  canCreate: boolean;
};

/** Astryx EmptyState for an empty product catalog. */
export function CatalogEmptyState({ canCreate }: CatalogEmptyProps) {
  return (
    <Card variant="muted">
      <EmptyState
        icon={emptyIcon(Package01Icon)}
        title="No products yet"
        description={
          canCreate
            ? "Add your first fragrance to start tracking stock."
            : "Products appear here once the owner adds them."
        }
        actions={
          canCreate ? (
            <Button label="Create product" href="/products/new" variant="primary" />
          ) : undefined
        }
      />
    </Card>
  );
}

/** Astryx EmptyState when the low-stock list is clear. */
export function LowStockClearState() {
  return (
    <Card variant="muted">
      <EmptyState
        icon={emptyIcon(Alert02Icon)}
        title="All clear"
        description="No oil, base, packaging or finished bottle is at its reorder level."
        actions={<Button label="Receive stock" href="/stock" variant="secondary" />}
      />
    </Card>
  );
}
