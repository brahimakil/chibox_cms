import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrencySymbol } from '@/lib/currency';

/**
 * GET /api/dashboard/stats
 * Returns basic dashboard statistics (totals and counts)
 * This is the fastest endpoint and should load first
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Parse dates or use defaults
    let start: Date | null = null;
    let end: Date | null = null;
    
    if (startDate) {
      start = new Date(startDate);
    }
    if (endDate) {
      end = new Date(endDate);
      // Set to end of day
      end.setHours(23, 59, 59, 999);
    }

    // Build date filter conditions
    let dateFilter = '';
    const dateValues: Date[] = [];
    
    if (start && end) {
      dateFilter = 'AND created_at BETWEEN ? AND ?';
      dateValues.push(start, end);
    } else if (start) {
      dateFilter = 'AND created_at >= ?';
      dateValues.push(start);
    } else if (end) {
      dateFilter = 'AND created_at <= ?';
      dateValues.push(end);
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Get this week's date range (Monday to Sunday)
    const thisWeekStart = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    thisWeekStart.setDate(diff);
    thisWeekStart.setHours(0, 0, 0, 0);

    // Get this month's date range
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    thisMonthStart.setHours(0, 0, 0, 0);

    // Execute all queries in parallel for better performance
    const [
      totalOrdersResult,
      totalRevenueResult,
      totalProductsResult,
      totalCategoriesResult,
      totalUsersResult,
      totalBrandsResult,
      totalNotificationsResult,
      ordersTodayResult,
      revenueTodayResult,
      ordersThisWeekResult,
      revenueThisWeekResult,
      ordersThisMonthResult,
      revenueThisMonthResult,
    ] = await Promise.all([
      // Total orders
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) as count FROM orders ${dateFilter ? 'WHERE 1=1 ' + dateFilter : ''}`,
        ...dateValues
      ),
      // Total revenue
      prisma.$queryRawUnsafe<Array<{ revenue: number }>>(
        `SELECT COALESCE(SUM(total + shipping_amount), 0) as revenue FROM orders ${dateFilter ? 'WHERE 1=1 ' + dateFilter : ''}`,
        ...dateValues
      ),
      // Total products
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*) as count FROM product`),
      // Total categories
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*) as count FROM category`),
      // Total users
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*) as count FROM users`),
      // Total brands
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*) as count FROM brand`),
      // Total notifications
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*) as count FROM notifications`),
      // Orders today
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) as count FROM orders WHERE created_at >= ? AND created_at <= ?`,
        today,
        todayEnd
      ),
      // Revenue today
      prisma.$queryRawUnsafe<Array<{ revenue: number }>>(
        `SELECT COALESCE(SUM(total + shipping_amount), 0) as revenue FROM orders WHERE created_at >= ? AND created_at <= ?`,
        today,
        todayEnd
      ),
      // Orders this week
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) as count FROM orders WHERE created_at >= ?`,
        thisWeekStart
      ),
      // Revenue this week
      prisma.$queryRawUnsafe<Array<{ revenue: number }>>(
        `SELECT COALESCE(SUM(total + shipping_amount), 0) as revenue FROM orders WHERE created_at >= ?`,
        thisWeekStart
      ),
      // Orders this month
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) as count FROM orders WHERE created_at >= ?`,
        thisMonthStart
      ),
      // Revenue this month
      prisma.$queryRawUnsafe<Array<{ revenue: number }>>(
        `SELECT COALESCE(SUM(total + shipping_amount), 0) as revenue FROM orders WHERE created_at >= ?`,
        thisMonthStart
      ),
    ]);

    // Get currency symbol for consistent display
    // Note: We assume order prices are already in USD (converted at order time)
    const currencySymbol = getCurrencySymbol();

    const stats = {
      totalOrders: Number(totalOrdersResult[0]?.count || 0),
      totalRevenue: Number(totalRevenueResult[0]?.revenue || 0),
      totalProducts: Number(totalProductsResult[0]?.count || 0),
      totalCategories: Number(totalCategoriesResult[0]?.count || 0),
      totalUsers: Number(totalUsersResult[0]?.count || 0),
      totalBrands: Number(totalBrandsResult[0]?.count || 0),
      totalNotifications: Number(totalNotificationsResult[0]?.count || 0),
      ordersToday: Number(ordersTodayResult[0]?.count || 0),
      ordersThisWeek: Number(ordersThisWeekResult[0]?.count || 0),
      ordersThisMonth: Number(ordersThisMonthResult[0]?.count || 0),
      revenueToday: Number(revenueTodayResult[0]?.revenue || 0),
      revenueThisWeek: Number(revenueThisWeekResult[0]?.revenue || 0),
      revenueThisMonth: Number(revenueThisMonthResult[0]?.revenue || 0),
      currencySymbol, // Added for consistent currency display
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard statistics',
      },
      { status: 500 }
    );
  }
}

