/**
 * Invalidate Yii2 backend home-screen cache (banners + flash sales).
 * Fire-and-forget — failures are logged but never block the CMS response.
 */
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://cms2.devback.website";

const CACHE_CLEAR_SECRET =
  process.env.CACHE_CLEAR_SECRET || "chihelo-cache-clear-2026-secret-key";

export async function invalidateHomeCache(): Promise<void> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/v3_0_0-app/clear-home-cache`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: CACHE_CLEAR_SECRET }),
        signal: AbortSignal.timeout(5000), // 5 s max
      }
    );

    if (!res.ok) {
      console.warn(`[cache-invalidation] Backend returned ${res.status}`);
    }
  } catch (err) {
    // Non-critical — the cache will expire on its own in ≤5 min
    console.warn("[cache-invalidation] Failed to clear backend cache:", err);
  }
}
