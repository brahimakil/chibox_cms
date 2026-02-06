import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrencySymbol } from '@/lib/currency';

/**
 * GET /api/dashboard/top-products
 * Returns top products by order count and revenue
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
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

    // Build date filter
    let dateFilter = '';
    const dateValues: any[] = [];
    
    if (start && end) {
      dateFilter = 'WHERE o.created_at BETWEEN ? AND ?';
      dateValues.push(start, end);
    } else if (start) {
      dateFilter = 'WHERE o.created_at >= ?';
      dateValues.push(start);
    } else if (end) {
      dateFilter = 'WHERE o.created_at <= ?';
      dateValues.push(end);
    }

    // Top products query
    let topProductsQuery = `
      SELECT 
        p.id,
        p.product_name,
        p.display_name,
        p.main_image,
        COUNT(op.id) as order_count,
        COALESCE(SUM(op.product_price * op.quantity), 0) as total_revenue
      FROM product p
      LEFT JOIN order_products op ON p.id = op.r_product_id
      LEFT JOIN orders o ON op.r_order_id = o.id
      ${dateFilter}
      GROUP BY p.id, p.product_name, p.display_name, p.main_image
      HAVING order_count > 0
      ORDER BY order_count DESC
      LIMIT ?
    `;
    
    dateValues.push(limit);
    
    const topProductsResult = await prisma.$queryRawUnsafe<any[]>(
      topProductsQuery,
      ...dateValues
    );

    // Get currency symbol for consistent display
    // Note: Revenue is calculated from order_products.product_price which is assumed to be in USD
    const currencySymbol = getCurrencySymbol();

    const topProducts = topProductsResult.map((product) => ({
      id: Number(product.id),
      productName: product.product_name || '',
      displayName: product.display_name || null,
      orderCount: Number(product.order_count || 0),
      totalRevenue: Number(product.total_revenue || 0),
      mainImage: product.main_image || null,
      currencySymbol, // Added for consistent currency display
    }));

    return NextResponse.json({
      success: true,
      topProducts,
      currencySymbol, // Also return at top level for convenience
    });
  } catch (error) {
    console.error('Dashboard top products error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch top products',
      },
      { status: 500 }
    );
  }
}

