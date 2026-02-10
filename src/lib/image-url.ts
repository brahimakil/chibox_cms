/**
 * Resolves image URLs that may be stored as relative paths in the database.
 *
 * The DB stores images in two formats:
 *  1. Absolute URLs (https://...) — returned as-is (http:// upgraded to https://)
 *  2. Relative paths (/uploads/categories/... or /uploads/compressedcategories/...) —
 *     need the backend base URL prepended
 *
 * @param path  The raw `main_image` value from the database
 * @returns     A fully-qualified URL, or `null` if the input is empty
 */
export function resolveImageUrl(path: string | null | undefined): string | null {
  if (!path || path.trim() === "") return null;

  // Already an absolute URL
  if (path.startsWith("http://") || path.startsWith("https://")) {
    // Upgrade http → https to prevent mixed-content blocking on HTTPS pages
    if (path.startsWith("http://")) {
      return path.replace("http://", "https://");
    }
    return path;
  }

  // Relative path → prepend backend base URL
  const base = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/+$/, "");
  // Ensure there is exactly one `/` between base and path
  const separator = path.startsWith("/") ? "" : "/";
  return base ? `${base}${separator}${path}` : path;
}
