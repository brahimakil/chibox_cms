/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tryon-generations
 * 
 * Query params:
 *   view       - "users" | "products" | "all" (default: "all")
 *   page       - page number (default: 1)
 *   pageSize   - items per page (default: 30)
 *   search     - search by user name/email or product name
 *   status     - filter by status: "completed" | "failed" | "pending"
 *   product_id - filter by specific product
 *   user_id    - filter by specific user
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const view = sp.get("view") || "all";
    const page = Math.max(1, Number(sp.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") || "30")));
    const search = sp.get("search")?.trim() || "";
    const status = sp.get("status") || "";
    const productId = sp.get("product_id") ? Number(sp.get("product_id")) : null;
    const userId = sp.get("user_id") ? Number(sp.get("user_id")) : null;
    const offset = (page - 1) * pageSize;

    // ── Products view: group by product with usage count ──
    if (view === "products") {
      const whereClause: string[] = ["1=1"];
      const params: any[] = [];

      if (search) {
        whereClause.push("(p.display_name LIKE ? OR p.product_name LIKE ? OR p.product_code LIKE ?)");
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (status) {
        whereClause.push("g.status = ?");
        params.push(status);
      }

      const countResult = await prisma.$queryRawUnsafe<[{ cnt: bigint }]>(
        `SELECT COUNT(DISTINCT g.product_id) as cnt
         FROM ai_tryon_generations g
         JOIN product p ON p.id = g.product_id
         WHERE ${whereClause.join(" AND ")}`,
        ...params
      );
      const total = Number(countResult[0]?.cnt ?? 0);

      const products = await prisma.$queryRawUnsafe<any[]>(
        `SELECT 
           g.product_id,
           p.display_name,
           p.product_name,
           p.product_code,
           p.main_image,
           COUNT(*) as total_generations,
           SUM(CASE WHEN g.status = 'completed' THEN 1 ELSE 0 END) as completed_count,
           SUM(CASE WHEN g.status = 'failed' THEN 1 ELSE 0 END) as failed_count,
           COUNT(DISTINCT g.user_id) as unique_users,
           MAX(g.created_at) as last_used_at
         FROM ai_tryon_generations g
         JOIN product p ON p.id = g.product_id
         WHERE ${whereClause.join(" AND ")}
         GROUP BY g.product_id, p.display_name, p.product_name, p.product_code, p.main_image
         ORDER BY total_generations DESC
         LIMIT ? OFFSET ?`,
        ...params, pageSize, offset
      );

      return NextResponse.json({
        products: products.map((r: any) => ({
          product_id: Number(r.product_id),
          name: r.display_name || r.product_name || `#${r.product_id}`,
          product_code: r.product_code,
          main_image: r.main_image,
          total_generations: Number(r.total_generations),
          completed_count: Number(r.completed_count),
          failed_count: Number(r.failed_count),
          unique_users: Number(r.unique_users),
          last_used_at: r.last_used_at,
        })),
        total,
        totalPages: Math.ceil(total / pageSize),
        page,
      });
    }

    // ── Users view: group by user with usage count ──
    if (view === "users") {
      const whereClause: string[] = ["1=1"];
      const params: any[] = [];

      if (search) {
        whereClause.push("(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)");
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (status) {
        whereClause.push("g.status = ?");
        params.push(status);
      }

      const countResult = await prisma.$queryRawUnsafe<[{ cnt: bigint }]>(
        `SELECT COUNT(DISTINCT g.user_id) as cnt
         FROM ai_tryon_generations g
         JOIN users u ON u.id = g.user_id
         WHERE ${whereClause.join(" AND ")}`,
        ...params
      );
      const total = Number(countResult[0]?.cnt ?? 0);

      const users = await prisma.$queryRawUnsafe<any[]>(
        `SELECT 
           g.user_id,
           CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')) as full_name,
           u.email,
           u.main_image as profile_image,
           COUNT(*) as total_generations,
           SUM(CASE WHEN g.status = 'completed' THEN 1 ELSE 0 END) as completed_count,
           SUM(CASE WHEN g.status = 'failed' THEN 1 ELSE 0 END) as failed_count,
           COUNT(DISTINCT g.product_id) as unique_products,
           MAX(g.created_at) as last_used_at
         FROM ai_tryon_generations g
         JOIN users u ON u.id = g.user_id
         WHERE ${whereClause.join(" AND ")}
         GROUP BY g.user_id, u.first_name, u.last_name, u.email, u.main_image
         ORDER BY total_generations DESC
         LIMIT ? OFFSET ?`,
        ...params, pageSize, offset
      );

      return NextResponse.json({
        users: users.map((r: any) => ({
          user_id: Number(r.user_id),
          full_name: r.full_name || "Unknown",
          email: r.email,
          profile_image: r.profile_image,
          total_generations: Number(r.total_generations),
          completed_count: Number(r.completed_count),
          failed_count: Number(r.failed_count),
          unique_products: Number(r.unique_products),
          last_used_at: r.last_used_at,
        })),
        total,
        totalPages: Math.ceil(total / pageSize),
        page,
      });
    }

    // ── All view: individual generation records ──
    const whereClause: string[] = ["1=1"];
    const params: any[] = [];

    if (search) {
      whereClause.push("(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR p.display_name LIKE ? OR p.product_name LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      whereClause.push("g.status = ?");
      params.push(status);
    }
    if (productId) {
      whereClause.push("g.product_id = ?");
      params.push(productId);
    }
    if (userId) {
      whereClause.push("g.user_id = ?");
      params.push(userId);
    }

    const countResult = await prisma.$queryRawUnsafe<[{ cnt: bigint }]>(
      `SELECT COUNT(*) as cnt
       FROM ai_tryon_generations g
       JOIN users u ON u.id = g.user_id
       JOIN product p ON p.id = g.product_id
       WHERE ${whereClause.join(" AND ")}`,
      ...params
    );
    const total = Number(countResult[0]?.cnt ?? 0);

    const generations = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
         g.id,
         g.user_id,
         g.product_id,
         g.category_id,
         g.color_name,
         g.user_photo_url,
         g.generated_image_url,
         g.generation_time_ms,
         g.status,
         g.error_message,
         g.created_at,
         CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')) as user_name,
         u.email as user_email,
         u.main_image as user_profile_image,
         p.display_name as product_name,
         p.product_code,
         p.main_image as product_image,
         c.category_name
       FROM ai_tryon_generations g
       JOIN users u ON u.id = g.user_id
       JOIN product p ON p.id = g.product_id
       LEFT JOIN category c ON c.id = g.category_id
       WHERE ${whereClause.join(" AND ")}
       ORDER BY g.created_at DESC
       LIMIT ? OFFSET ?`,
      ...params, pageSize, offset
    );

    return NextResponse.json({
      generations: generations.map((g: any) => ({
        id: Number(g.id),
        user_id: Number(g.user_id),
        product_id: Number(g.product_id),
        category_id: Number(g.category_id),
        color_name: g.color_name,
        user_photo_url: g.user_photo_url,
        generated_image_url: g.generated_image_url,
        generation_time_ms: g.generation_time_ms ? Number(g.generation_time_ms) : null,
        status: g.status,
        error_message: g.error_message,
        created_at: g.created_at,
        user_name: g.user_name || "Unknown",
        user_email: g.user_email,
        user_profile_image: g.user_profile_image,
        product_name: g.product_name || g.product_code || `#${g.product_id}`,
        product_code: g.product_code,
        product_image: g.product_image,
        category_name: g.category_name,
      })),
      total,
      totalPages: Math.ceil(total / pageSize),
      page,
    });
  } catch (error) {
    console.error("Error fetching tryon generations:", error);
    return NextResponse.json(
      { error: "Failed to fetch generations" },
      { status: 500 }
    );
  }
}
