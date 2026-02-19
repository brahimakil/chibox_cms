/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tryon-generations/stats
 * Returns aggregate statistics for the AI Try-On feature
 */
export async function GET() {
  try {
    const [totals, todayCount, avgTime, topProducts, topUsers, statusBreakdown, dailyTrend] =
      await Promise.all([
        // Total counts
        prisma.$queryRawUnsafe<any[]>(
          `SELECT 
             COUNT(*) as total_generations,
             COUNT(DISTINCT user_id) as total_users,
             COUNT(DISTINCT product_id) as total_products,
             SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
             SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
             SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
           FROM ai_tryon_generations`
        ),
        // Today's generations
        prisma.$queryRawUnsafe<[{ cnt: bigint }]>(
          `SELECT COUNT(*) as cnt FROM ai_tryon_generations WHERE DATE(created_at) = CURDATE()`
        ),
        // Average generation time (completed only)
        prisma.$queryRawUnsafe<[{ avg_ms: number | null }]>(
          `SELECT AVG(generation_time_ms) as avg_ms FROM ai_tryon_generations WHERE status = 'completed' AND generation_time_ms IS NOT NULL`
        ),
        // Top 5 products
        prisma.$queryRawUnsafe<any[]>(
          `SELECT g.product_id, p.display_name, p.product_name, p.main_image, COUNT(*) as cnt
           FROM ai_tryon_generations g
           JOIN product p ON p.id = g.product_id
           GROUP BY g.product_id, p.display_name, p.product_name, p.main_image
           ORDER BY cnt DESC
           LIMIT 5`
        ),
        // Top 5 users
        prisma.$queryRawUnsafe<any[]>(
          `SELECT g.user_id, CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')) as full_name, u.email, COUNT(*) as cnt
           FROM ai_tryon_generations g
           JOIN users u ON u.id = g.user_id
           GROUP BY g.user_id, u.first_name, u.last_name, u.email
           ORDER BY cnt DESC
           LIMIT 5`
        ),
        // Status breakdown for pie chart
        prisma.$queryRawUnsafe<any[]>(
          `SELECT status, COUNT(*) as cnt FROM ai_tryon_generations GROUP BY status`
        ),
        // Daily trend (last 14 days)
        prisma.$queryRawUnsafe<any[]>(
          `SELECT DATE(created_at) as day, COUNT(*) as cnt
           FROM ai_tryon_generations
           WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
           GROUP BY DATE(created_at)
           ORDER BY day ASC`
        ),
      ]);

    const t = totals[0] || {};

    return NextResponse.json({
      total_generations: Number(t.total_generations ?? 0),
      total_users: Number(t.total_users ?? 0),
      total_products: Number(t.total_products ?? 0),
      completed: Number(t.completed ?? 0),
      failed: Number(t.failed ?? 0),
      pending: Number(t.pending ?? 0),
      today_count: Number(todayCount[0]?.cnt ?? 0),
      avg_generation_time_ms: avgTime[0]?.avg_ms ? Math.round(Number(avgTime[0].avg_ms)) : null,
      top_products: topProducts.map((r: any) => ({
        product_id: Number(r.product_id),
        name: r.display_name || r.product_name || `#${r.product_id}`,
        main_image: r.main_image,
        count: Number(r.cnt),
      })),
      top_users: topUsers.map((r: any) => ({
        user_id: Number(r.user_id),
        name: r.full_name || "Unknown",
        email: r.email,
        count: Number(r.cnt),
      })),
      status_breakdown: statusBreakdown.map((r: any) => ({
        status: r.status,
        count: Number(r.cnt),
      })),
      daily_trend: dailyTrend.map((r: any) => ({
        day: r.day,
        count: Number(r.cnt),
      })),
    });
  } catch (error) {
    console.error("Error fetching tryon stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
