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

/**
 * Returns a CDN-optimized thumbnail URL for Alibaba CDN images (alicdn.com).
 * Appends `_WxH.jpg` suffix to request a smaller thumbnail from the CDN.
 * Non-alicdn URLs are returned as-is via resolveImageUrl().
 * Pass the full URL or a raw DB path — both work.
 *
 * @param path  Raw image URL or DB path
 * @param size  Desired thumbnail size in pixels (default: 100 — good for 40-50px display)
 * @returns     Thumbnail URL, or `null` if the input is empty
 */
export function thumbnailUrl(
  path: string | null | undefined,
  size: number = 100
): string | null {
  const resolved = resolveImageUrl(path);
  if (!resolved) return null;

  // Only apply the suffix to Alibaba CDN URLs
  if (!resolved.includes("alicdn.com")) return resolved;

  // Strip any existing size suffix (e.g. _400x400.jpg) before adding new one
  const stripped = resolved.replace(/_\d+x\d+\.\w+$/, "");
  return `${stripped}_${size}x${size}.jpg`;
}
