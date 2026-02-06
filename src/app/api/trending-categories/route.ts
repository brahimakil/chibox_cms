import { NextResponse } from "next/server"

export async function GET() {
  try {
    const response = await fetch("https://cms2.devback.website/v2_0_0-sync-dashboard/trending-categories")
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching trending categories:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch trending categories" }, { status: 500 })
  }
}
