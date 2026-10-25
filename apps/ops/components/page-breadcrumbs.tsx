import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";

export type PageCrumb = {
  label: string;
  /** Omit on the last crumb: it is the page on screen. */
  href?: string;
};

/** Trail from an Ops list page down to the record or form on screen. */
export function PageBreadcrumbs({ items }: { items: readonly PageCrumb[] }) {
  return (
    <Breadcrumbs
      variant="supporting"
      className="min-w-0 [&_a]:inline-flex [&_a]:items-center pointer-coarse:[&_a]:min-h-11"
    >
      {items.map((item) => (
        <BreadcrumbItem key={item.href ?? item.label} href={item.href}>
          {item.label}
        </BreadcrumbItem>
      ))}
    </Breadcrumbs>
  );
}
