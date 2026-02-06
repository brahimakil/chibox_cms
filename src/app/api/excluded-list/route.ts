export async function GET() {
    try {
      const response = await fetch("https://cms2.devback.website/v2_0_0-excluded-categories/list-for-ui")
      const data = await response.json()
      return Response.json(data)
    } catch (error) {
      return Response.json({ success: false, error: "Failed to fetch excluded categories" }, { status: 500 })
    }
  }
  