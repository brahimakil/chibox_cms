export async function GET() {
    try {
      const response = await fetch("https://cms2.devback.website/v2_0_0-excluded-categories/dashboard-stats")
      const data = await response.json()
      return Response.json(data)
    } catch (error) {
      console.error("Error fetching excluded stats:", error)
      return Response.json({ success: false, error: "Failed to fetch excluded stats" }, { status: 500 })
    }
  }
  