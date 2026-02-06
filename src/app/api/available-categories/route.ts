export async function GET() {
    try {
      const response = await fetch("https://cms2.devback.website/v2_0_0-excluded-categories/available-categories")
  
      if (!response.ok) {
        throw new Error("Failed to fetch available categories")
      }
  
      const data = await response.json()
      return Response.json(data)
    } catch (error) {
      console.error("Error fetching available categories:", error)
      return Response.json({ success: false, error: "Failed to fetch available categories" }, { status: 500 })
    }
  }
  