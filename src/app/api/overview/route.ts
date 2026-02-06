export async function GET() {
  try {
    const response = await fetch("https://cms2.devback.website/v2_0_0-sync-dashboard/overview")
    const data = await response.json()

    return Response.json(data)
  } catch (error) {
    console.error("Error fetching overview data:", error)
    return Response.json({ error: "Failed to fetch overview data" }, { status: 500 })
  }
}
