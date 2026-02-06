export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get("parent_id")
  
    if (!parentId) {
      return Response.json({ success: false, error: "Parent ID required" }, { status: 400 })
    }
  
    try {
      const response = await fetch(
        `https://cms2.devback.website/v2_0_0-excluded-categories/get-subcategories?parent_id=${parentId}`,
      )
      const data = await response.json()
      return Response.json(data)
    } catch (error) {
      return Response.json({ success: false, error: "Failed to fetch subcategories" }, { status: 500 })
    }
  }
  