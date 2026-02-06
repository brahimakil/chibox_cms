export async function GET() {
  try {
    const response = await fetch("https://cms2.devback.website/v2_0_0-sync-dashboard/price-extremes", {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error("Failed to fetch price extremes")
    }

    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    console.error("Error fetching price extremes:", error)
    return Response.json({ success: false, error: "Failed to fetch price extremes" }, { status: 500 })
  }
}
