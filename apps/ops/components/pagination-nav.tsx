import Link from "next/link";
import {
  Button,
  buttonVariants,
} from "@perfume-aura/ui/components/button";
import { paginationHref } from "@/lib/pagination";

type Props = {
  pathname: string;
  page: number;
  totalPages: number;
  total: number;
  search?: Record<string, string | number | undefined>;
  pageParam?: string;
};

export function PaginationNav({
  pathname,
  page,
  totalPages,
  total,
  search = {},
  pageParam = "page",
}: Props) {
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Page {page} of {totalPages} · {total} {total === 1 ? "record" : "records"}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={paginationHref(pathname, page - 1, search, pageParam)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Previous
          </Link>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
        )}
        {page < totalPages ? (
          <Link
            href={paginationHref(pathname, page + 1, search, pageParam)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Next
          </Link>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        )}
      </div>
    </nav>
  );
}
