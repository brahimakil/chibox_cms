export async function GET() {
  try {
    const response = await fetch("https://cms2.devback.website/v2_0_0-sync-dashboard/category-stats")
    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    console.error("Error fetching category stats:", error)
    return Response.json({ success: false, error: "Failed to fetch category stats" }, { status: 500 })
  }
}
