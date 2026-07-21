/**
 * Generate a URL-safe slug from a product name.
 * Uniqueness is enforced by the DB unique constraint; callers may append a suffix.
 */
export function slugify(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return base.length > 0 ? base : "product";
}

/** Short random suffix for slug collisions (hex, 6 chars). */
export function shortId(length = 6): string {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, length);
}
