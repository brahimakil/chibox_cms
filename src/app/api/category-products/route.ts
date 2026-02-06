import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get("page") || "1"
    const category_id = searchParams.get("category_id")
    const search = searchParams.get("search") || ""
    const limit = searchParams.get("limit") || "12"

    const params = new URLSearchParams({
      page,
      limit,
      ...(category_id && { category_id }),
      ...(search && { search }),
    })

    const response = await fetch(
      `https://cms2.devback.website/v2_0_0-sync-dashboard/get-products?${params.toString()}`
    )
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching category products:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch category products" }, { status: 500 })
  }
}

