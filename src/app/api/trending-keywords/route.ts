export async function GET() {
  try {
    const response = await fetch("https://cms2.devback.website/v2_0_0-search/trending-keywords?limit=5")

    if (!response.ok) {
      throw new Error("Failed to fetch trending keywords")
    }

    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    console.error("Error fetching trending keywords:", error)
    return Response.json({ success: false, error: "Failed to fetch trending keywords" }, { status: 500 })
  }
}
