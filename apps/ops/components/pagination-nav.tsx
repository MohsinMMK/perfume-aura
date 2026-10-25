"use client";

import { useRouter } from "next/navigation";
import { HStack } from "@astryxdesign/core/HStack";
import { Pagination } from "@astryxdesign/core/Pagination";
import { Text } from "@astryxdesign/core/Text";
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
  const router = useRouter();
  return (
    <HStack
      justify="between"
      align="center"
      gap={3}
      wrap="wrap"
      className="border-t border-border px-4 py-3"
    >
      <Text size="sm" color="secondary" aria-live="polite">
        Page {page} of {totalPages} · {total} {total === 1 ? "record" : "records"}
      </Text>
      <Pagination
        page={page}
        totalPages={Math.max(totalPages, 1)}
        variant="compact"
        size="sm"
        onChange={(next) =>
          router.push(paginationHref(pathname, next, search, pageParam))
        }
      />
    </HStack>
  );
}
