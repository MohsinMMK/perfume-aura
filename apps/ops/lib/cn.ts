/** Joins the truthy class names; Astryx owns component styling, so no merging is needed. */
export function cn(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}
