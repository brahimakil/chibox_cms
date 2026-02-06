import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrencySymbol } from '@/lib/currency';

/**
 * GET /api/dashboard/top-categories
 * Returns top categories by product count and revenue
 * Also returns all categories for filter dropdown
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const categoryId = searchParams.get('category_id');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Parse dates
    let start: Date | null = null;
    let end: Date | null = null;
    
    if (startDate) {
      start = new Date(startDate);
    }
    if (endDate) {
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    }

    // Build filters
    let topCategoriesQuery = `
      SELECT 
        c.id,
        c.category_name,
        c.product_count,
        c.main_image,
        c.parent,
        c.level,
        COALESCE(SUM(op.product_price * op.quantity), 0) as total_revenue,
        COUNT(DISTINCT op.r_order_id) as order_count
      FROM category c
      LEFT JOIN product p ON p.category_id = c.id
      LEFT JOIN order_products op ON p.id = op.r_product_id
      LEFT JOIN orders o ON op.r_order_id = o.id
    `;
    
    const categoryFilterParams: any[] = [];
    const whereConditions: string[] = [];
    
    if (categoryId && categoryId !== 'all') {
      whereConditions.push('c.id = ?');
      categoryFilterParams.push(parseInt(categoryId));
    }
    
    if (start && end) {
      whereConditions.push('(o.created_at BETWEEN ? AND ? OR o.created_at IS NULL)');
      categoryFilterParams.push(start, end);
    } else if (start) {
      whereConditions.push('(o.created_at >= ? OR o.created_at IS NULL)');
      categoryFilterParams.push(start);
    } else if (end) {
      whereConditions.push('(o.created_at <= ? OR o.created_at IS NULL)');
      categoryFilterParams.push(end);
    }
    
    if (whereConditions.length > 0) {
      topCategoriesQuery += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    topCategoriesQuery += `
      GROUP BY c.id, c.category_name, c.product_count, c.main_image, c.parent, c.level
      HAVING product_count > 0
      ORDER BY product_count DESC, total_revenue DESC
      LIMIT ?
    `;
    
    categoryFilterParams.push(limit);
    
    // Fetch top categories and all categories in parallel
    const [topCategoriesResult, allCategoriesResult] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(
        topCategoriesQuery,
        ...categoryFilterParams
      ),
      prisma.$queryRawUnsafe<Array<{ id: number; category_name: string }>>(
        `SELECT id, category_name FROM category WHERE product_count > 0 ORDER BY category_name ASC LIMIT 100`
      ),
    ]);

    // Get currency symbol for consistent display
    // Note: Revenue is calculated from order_products.product_price which is assumed to be in USD
    const currencySymbol = getCurrencySymbol();

    const topCategories = topCategoriesResult.map((category) => ({
      id: Number(category.id),
      categoryName: category.category_name || '',
      productCount: Number(category.product_count || 0),
      totalRevenue: Number(category.total_revenue || 0),
      orderCount: Number(category.order_count || 0),
      mainImage: category.main_image || null,
      parent: category.parent !== null ? Number(category.parent) : null,
      level: Number(category.level || 0),
      currencySymbol, // Added for consistent currency display
    }));

    const allCategories = allCategoriesResult.map((cat) => ({
      id: Number(cat.id),
      categoryName: cat.category_name || '',
    }));

    return NextResponse.json({
      success: true,
      topCategories,
      allCategories,
      currencySymbol, // Also return at top level for convenience
    });
  } catch (error) {
    console.error('Dashboard top categories error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch top categories',
      },
      { status: 500 }
    );
  }
}

