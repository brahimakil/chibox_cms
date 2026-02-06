import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrencySymbol } from '@/lib/currency';

/**
 * GET /api/dashboard/charts
 * Returns chart data: order status breakdown, payment status, revenue by period, and registered users
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const period = searchParams.get('period') || 'month'; // day, week, month, year
    const userPeriod = searchParams.get('user_period') || 'day'; // Separate period for registered users

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

    // Build date filter conditions
    let dateFilter = '';
    const dateValues: any[] = [];
    
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

    // Get total orders for percentage calculation
    const totalOrdersResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count FROM orders ${dateFilter ? 'WHERE 1=1 ' + dateFilter : ''}`,
      ...dateValues
    );
    const totalOrders = Number(totalOrdersResult[0]?.count || 0);

    // Order status breakdown
    const statusBreakdownResult = await prisma.$queryRawUnsafe<Array<{ status: number; count: bigint }>>(
      `SELECT status, COUNT(*) as count FROM orders ${dateFilter ? 'WHERE 1=1 ' + dateFilter : ''} GROUP BY status ORDER BY count DESC`,
      ...dateValues
    );

    // Get status names
    const orderStatusBreakdown = await Promise.all(
      statusBreakdownResult.map(async (item) => {
        let statusName = `Status ${item.status}`;
        try {
          const statusResult = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
            `SELECT name FROM ag_list_options WHERE id = ? LIMIT 1`,
            item.status
          );
          if (statusResult && statusResult.length > 0) {
            statusName = statusResult[0].name;
          }
        } catch (error) {
          console.error('Error fetching status name:', error);
        }

        return {
          status: item.status,
          statusName,
          count: Number(item.count),
          percentage: totalOrders > 0 ? (Number(item.count) / totalOrders) * 100 : 0,
        };
      })
    );

    // Payment status
    const [paidOrdersResult, unpaidOrdersResult] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) as count FROM orders WHERE is_paid = 1 ${dateFilter ? 'AND 1=1 ' + dateFilter : ''}`,
        ...dateValues
      ),
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) as count FROM orders WHERE is_paid = 0 ${dateFilter ? 'AND 1=1 ' + dateFilter : ''}`,
        ...dateValues
      ),
    ]);

    const paidOrders = Number(paidOrdersResult[0]?.count || 0);
    const unpaidOrders = Number(unpaidOrdersResult[0]?.count || 0);

    // Revenue by period
    let groupByFormat = '';
    switch (period) {
      case 'day':
        groupByFormat = 'DATE_FORMAT(created_at, "%Y-%m-%d")';
        break;
      case 'week':
        groupByFormat = 'DATE_FORMAT(created_at, "%Y-%u")';
        break;
      case 'month':
        groupByFormat = 'DATE_FORMAT(created_at, "%Y-%m")';
        break;
      case 'year':
        groupByFormat = 'DATE_FORMAT(created_at, "%Y")';
        break;
      default:
        groupByFormat = 'DATE_FORMAT(created_at, "%Y-%m")';
    }

    const revenueByPeriodResult = await prisma.$queryRawUnsafe<Array<{ period: string; revenue: number; orders: bigint }>>(
      `SELECT ${groupByFormat} as period, COALESCE(SUM(total + shipping_amount), 0) as revenue, COUNT(*) as orders FROM orders ${dateFilter ? 'WHERE 1=1 ' + dateFilter : ''} GROUP BY ${groupByFormat} ORDER BY period DESC LIMIT 30`,
      ...dateValues
    );

    const revenueByPeriod = revenueByPeriodResult.map((item) => ({
      period: item.period,
      revenue: Number(item.revenue || 0),
      orders: Number(item.orders || 0),
    }));

    // User type breakdown
    const userTypeBreakdownResult = await prisma.$queryRawUnsafe<Array<{ type: number; count: bigint }>>(
      `SELECT type, COUNT(*) as count FROM users GROUP BY type`
    );

    const userTypeBreakdown = {
      normal: 0,
      google: 0,
      facebook: 0,
      apple: 0,
    };

    userTypeBreakdownResult.forEach((item) => {
      const count = Number(item.count);
      switch (item.type) {
        case 3: // normal
          userTypeBreakdown.normal = count;
          break;
        case 4: // google
          userTypeBreakdown.google = count;
          break;
        case 5: // apple
          userTypeBreakdown.apple = count;
          break;
        case 6: // facebook
          userTypeBreakdown.facebook = count;
          break;
      }
    });

    // Registered users by period
    let userGroupByFormat = '';
    switch (userPeriod) {
      case 'day':
        userGroupByFormat = 'DATE_FORMAT(created_at, "%Y-%m-%d")';
        break;
      case 'week':
        userGroupByFormat = 'DATE_FORMAT(created_at, "%Y-%u")';
        break;
      case 'month':
        userGroupByFormat = 'DATE_FORMAT(created_at, "%Y-%m")';
        break;
      case 'year':
        userGroupByFormat = 'DATE_FORMAT(created_at, "%Y")';
        break;
      default:
        userGroupByFormat = 'DATE_FORMAT(created_at, "%Y-%m-%d")';
    }

    let userDateFilter = '';
    const userDateValues: any[] = [];
    
    if (start && end) {
      userDateFilter = 'WHERE created_at BETWEEN ? AND ?';
      userDateValues.push(start, end);
    } else if (start) {
      userDateFilter = 'WHERE created_at >= ?';
      userDateValues.push(start);
    } else if (end) {
      userDateFilter = 'WHERE created_at <= ?';
      userDateValues.push(end);
    }

    const registeredUsersResult = await prisma.$queryRawUnsafe<Array<{
      period: string;
      normal_users: bigint;
      google_users: bigint;
      facebook_users: bigint;
      apple_users: bigint;
      total: bigint;
    }>>(
      `SELECT ${userGroupByFormat} as period, SUM(CASE WHEN type = 3 THEN 1 ELSE 0 END) as normal_users, SUM(CASE WHEN type = 4 THEN 1 ELSE 0 END) as google_users, SUM(CASE WHEN type = 6 THEN 1 ELSE 0 END) as facebook_users, SUM(CASE WHEN type = 5 THEN 1 ELSE 0 END) as apple_users, COUNT(*) as total FROM users ${userDateFilter} GROUP BY ${userGroupByFormat} HAVING total > 0 ORDER BY period ASC`,
      ...userDateValues
    );

    const registeredUsers = registeredUsersResult.map((item) => ({
      period: item.period,
      normalUsers: Number(item.normal_users || 0),
      googleUsers: Number(item.google_users || 0),
      facebookUsers: Number(item.facebook_users || 0),
      appleUsers: Number(item.apple_users || 0),
      total: Number(item.total || 0),
    }));

    // Get currency symbol for consistent display
    // Note: Revenue is from orders.total which is assumed to be in USD
    const currencySymbol = getCurrencySymbol();

    return NextResponse.json({
      success: true,
      charts: {
        orderStatusBreakdown,
        paidOrders,
        unpaidOrders,
        totalOrders,
        revenueByPeriod,
        registeredUsers,
        userTypeBreakdown,
        currencySymbol, // Added for consistent currency display
      },
    });
  } catch (error) {
    console.error('Dashboard charts error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch chart data',
      },
      { status: 500 }
    );
  }
}

