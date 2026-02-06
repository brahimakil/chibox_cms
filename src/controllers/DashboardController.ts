import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrencySymbol } from '@/lib/currency';

export interface DashboardStats {
  // Overview statistics
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalCategories: number;
  totalUsers: number;
  totalBrands: number;
  totalNotifications: number;
  
  // Order statistics
  ordersToday: number;
  ordersThisWeek: number;
  ordersThisMonth: number;
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  
  // Order status breakdown
  orderStatusBreakdown: Array<{
    status: number;
    statusName?: string;
    count: number;
    percentage: number;
  }>;
  
  // Payment status
  paidOrders: number;
  unpaidOrders: number;
  
  // Recent orders
  recentOrders: Array<{
    id: number;
    total: number;
    quantity: number;
    status: number;
    statusName?: string;
    isPaid: number;
    createdAt: Date | null;
    customerName: string;
    shippingAmount: number;
    items: Array<{
      id: number;
      productName: string;
      productCode: string;
      quantity: number;
      productPrice: number;
      mainImage: string | null;
    }>;
  }>;
  
  // Top products (by order count or revenue)
  topProducts: Array<{
    id: number;
    productName: string;
    displayName: string | null;
    orderCount: number;
    totalRevenue: number;
    mainImage: string | null;
  }>;
  
  // Top categories (by product count or revenue)
  topCategories: Array<{
    id: number;
    categoryName: string;
    productCount: number;
    totalRevenue: number;
    orderCount: number;
    mainImage: string | null;
    parent: number | null;
    level: number;
  }>;
  
  // All categories for filter dropdown
  allCategories: Array<{
    id: number;
    categoryName: string;
  }>;
  
  // Revenue by period (for charts)
  revenueByPeriod: Array<{
    period: string;
    revenue: number;
    orders: number;
  }>;
  
  // Registered users by type
  registeredUsers: Array<{
    period: string;
    normalUsers: number;
    googleUsers: number;
    facebookUsers: number;
    appleUsers: number;
    total: number;
  }>;
  
  // User type breakdown
  userTypeBreakdown: {
    normal: number;
    google: number;
    facebook: number;
    apple: number;
  };
}

export class DashboardController {
  /**
   * @deprecated This monolithic endpoint is DEPRECATED. 
   * Please use the new split endpoints for better performance:
   * - GET /api/dashboard/stats - Basic statistics (100-200ms)
   * - GET /api/dashboard/charts - Chart data (300-500ms)  
   * - GET /api/dashboard/recent-orders - Recent orders (200-400ms)
   * - GET /api/dashboard/top-products - Top products (200-300ms)
   * - GET /api/dashboard/top-categories - Top categories (200-400ms)
   * 
   * This endpoint is kept for backward compatibility only.
   * It makes 50+ database queries and takes 5-10 seconds to respond.
   * 
   * Migration guide: See DASHBOARD_API_SPLIT.md and MIGRATION_GUIDE.md
   * 
   * @see /api/dashboard/stats
   * @see /api/dashboard/charts
   * @see /api/dashboard/recent-orders
   * @see /api/dashboard/top-products
   * @see /api/dashboard/top-categories
   */
  static async index(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams;
      const startDate = searchParams.get('start_date');
      const endDate = searchParams.get('end_date');
      const period = searchParams.get('period') || 'month'; // day, week, month, year
      const orderStatus = searchParams.get('order_status'); // Filter by order status
      const categoryId = searchParams.get('category_id'); // Filter by category
      const userPeriod = searchParams.get('user_period') || 'day'; // Separate period for registered users chart

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

      // Build status filter
      let statusFilter = '';
      const statusValue = orderStatus ? parseInt(orderStatus) : null;

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Get this week's date range (Monday to Sunday)
      const thisWeekStart = new Date(today);
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
      thisWeekStart.setDate(diff);
      thisWeekStart.setHours(0, 0, 0, 0);

      // Get this month's date range
      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      thisMonthStart.setHours(0, 0, 0, 0);

      // Total counts (all time or filtered)
      const totalOrdersQuery = `SELECT COUNT(*) as count FROM orders ${dateFilter ? 'WHERE 1=1 ' + dateFilter : ''}`;
      const totalOrdersResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        totalOrdersQuery,
        ...dateValues
      );
      const totalOrders = Number(totalOrdersResult[0]?.count || 0);

      const totalRevenueQuery = `SELECT COALESCE(SUM(total + shipping_amount), 0) as revenue FROM orders ${dateFilter ? 'WHERE 1=1 ' + dateFilter : ''}`;
      const totalRevenueResult = await prisma.$queryRawUnsafe<Array<{ revenue: number }>>(
        totalRevenueQuery,
        ...dateValues
      );
      const totalRevenue = Number(totalRevenueResult[0]?.revenue || 0);

      const totalProductsQuery = `SELECT COUNT(*) as count FROM product`;
      const totalProductsResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(totalProductsQuery);
      const totalProducts = Number(totalProductsResult[0]?.count || 0);

      const totalCategoriesQuery = `SELECT COUNT(*) as count FROM category`;
      const totalCategoriesResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(totalCategoriesQuery);
      const totalCategories = Number(totalCategoriesResult[0]?.count || 0);

      const totalUsersQuery = `SELECT COUNT(*) as count FROM users`;
      const totalUsersResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(totalUsersQuery);
      const totalUsers = Number(totalUsersResult[0]?.count || 0);

      const totalBrandsQuery = `SELECT COUNT(*) as count FROM brand`;
      const totalBrandsResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(totalBrandsQuery);
      const totalBrands = Number(totalBrandsResult[0]?.count || 0);

      const totalNotificationsQuery = `SELECT COUNT(*) as count FROM notifications`;
      const totalNotificationsResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(totalNotificationsQuery);
      const totalNotifications = Number(totalNotificationsResult[0]?.count || 0);

      // Today's statistics
      const ordersTodayQuery = `SELECT COUNT(*) as count FROM orders WHERE created_at >= ? AND created_at <= ?`;
      const ordersTodayResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        ordersTodayQuery,
        today,
        todayEnd
      );
      const ordersToday = Number(ordersTodayResult[0]?.count || 0);

      const revenueTodayQuery = `SELECT COALESCE(SUM(total + shipping_amount), 0) as revenue FROM orders WHERE created_at >= ? AND created_at <= ?`;
      const revenueTodayResult = await prisma.$queryRawUnsafe<Array<{ revenue: number }>>(
        revenueTodayQuery,
        today,
        todayEnd
      );
      const revenueToday = Number(revenueTodayResult[0]?.revenue || 0);

      // This week's statistics
      const ordersThisWeekQuery = `SELECT COUNT(*) as count FROM orders WHERE created_at >= ?`;
      const ordersThisWeekResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        ordersThisWeekQuery,
        thisWeekStart
      );
      const ordersThisWeek = Number(ordersThisWeekResult[0]?.count || 0);

      const revenueThisWeekQuery = `SELECT COALESCE(SUM(total + shipping_amount), 0) as revenue FROM orders WHERE created_at >= ?`;
      const revenueThisWeekResult = await prisma.$queryRawUnsafe<Array<{ revenue: number }>>(
        revenueThisWeekQuery,
        thisWeekStart
      );
      const revenueThisWeek = Number(revenueThisWeekResult[0]?.revenue || 0);

      // This month's statistics
      const ordersThisMonthQuery = `SELECT COUNT(*) as count FROM orders WHERE created_at >= ?`;
      const ordersThisMonthResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        ordersThisMonthQuery,
        thisMonthStart
      );
      const ordersThisMonth = Number(ordersThisMonthResult[0]?.count || 0);

      const revenueThisMonthQuery = `SELECT COALESCE(SUM(total + shipping_amount), 0) as revenue FROM orders WHERE created_at >= ?`;
      const revenueThisMonthResult = await prisma.$queryRawUnsafe<Array<{ revenue: number }>>(
        revenueThisMonthQuery,
        thisMonthStart
      );
      const revenueThisMonth = Number(revenueThisMonthResult[0]?.revenue || 0);

      // Order status breakdown
      const statusBreakdownQuery = `
        SELECT 
          status,
          COUNT(*) as count
        FROM orders
        ${dateFilter ? 'WHERE 1=1 ' + dateFilter : ''}
        GROUP BY status
        ORDER BY count DESC
      `;
      const statusBreakdownResult = await prisma.$queryRawUnsafe<Array<{ status: number; count: bigint }>>(
        statusBreakdownQuery,
        ...dateValues
      );

      // Get status names from ag_list_options
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
      const paidOrdersQuery = `SELECT COUNT(*) as count FROM orders WHERE is_paid = 1 ${dateFilter ? 'AND 1=1 ' + dateFilter : ''}`;
      const paidOrdersResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        paidOrdersQuery,
        ...dateValues
      );
      const paidOrders = Number(paidOrdersResult[0]?.count || 0);

      const unpaidOrdersQuery = `SELECT COUNT(*) as count FROM orders WHERE is_paid = 0 ${dateFilter ? 'AND 1=1 ' + dateFilter : ''}`;
      const unpaidOrdersResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        unpaidOrdersQuery,
        ...dateValues
      );
      const unpaidOrders = Number(unpaidOrdersResult[0]?.count || 0);

      // Recent orders (last 10) with items
      let recentOrdersWhere = '';
      const recentOrdersParams: any[] = [];
      
      if (dateFilter || statusValue !== null) {
        recentOrdersWhere = 'WHERE 1=1';
        if (dateFilter) {
          recentOrdersWhere += ' ' + dateFilter;
          recentOrdersParams.push(...dateValues);
        }
        if (statusValue !== null) {
          recentOrdersWhere += ' AND status = ?';
          recentOrdersParams.push(statusValue);
        }
      }

      const recentOrdersQuery = `
        SELECT 
          o.id,
          o.total,
          o.quantity,
          o.status,
          o.is_paid,
          o.shipping_amount,
          CAST(o.created_at AS CHAR) as created_at,
          CONCAT(o.address_first_name, ' ', o.address_last_name) as customer_name
        FROM orders o
        ${recentOrdersWhere}
        ORDER BY o.created_at DESC
        LIMIT 10
      `;
      const recentOrdersResult = await prisma.$queryRawUnsafe<any[]>(
        recentOrdersQuery,
        ...recentOrdersParams
      );

      const recentOrders = await Promise.all(
        recentOrdersResult.map(async (order) => {
          let statusName = `Status ${order.status}`;
          try {
            const statusResult = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
              `SELECT name FROM ag_list_options WHERE id = ? LIMIT 1`,
              order.status
            );
            if (statusResult && statusResult.length > 0) {
              statusName = statusResult[0].name;
            }
          } catch (error) {
            console.error('Error fetching status name:', error);
          }

          // Fetch order items/products
          const orderItemsQuery = `
            SELECT 
              op.id,
              op.product_name,
              op.product_code,
              op.quantity,
              op.product_price,
              p.main_image
            FROM order_products op
            LEFT JOIN product p ON op.r_product_id = p.id
            WHERE op.r_order_id = ?
            LIMIT 5
          `;
          const orderItemsResult = await prisma.$queryRawUnsafe<any[]>(
            orderItemsQuery,
            order.id
          );

          const items = orderItemsResult.map((item) => ({
            id: Number(item.id),
            productName: item.product_name || '',
            productCode: item.product_code || '',
            quantity: Number(item.quantity || 0),
            productPrice: Number(item.product_price || 0),
            mainImage: item.main_image || null,
          }));

          return {
            id: Number(order.id),
            total: Number(order.total),
            quantity: Number(order.quantity),
            status: Number(order.status),
            statusName,
            isPaid: Number(order.is_paid),
            createdAt: order.created_at ? new Date(order.created_at) : null,
            customerName: order.customer_name || 'Unknown',
            shippingAmount: Number(order.shipping_amount || 0),
            items,
          };
        })
      );

      // Top products (by order count) with images
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
      `;
      
      if (dateFilter) {
        const topProductsDateFilter = dateFilter.replace('created_at', 'o.created_at');
        topProductsQuery += ` WHERE 1=1 ${topProductsDateFilter}`;
      }
      
      topProductsQuery += `
        GROUP BY p.id, p.product_name, p.display_name, p.main_image
        HAVING order_count > 0
        ORDER BY order_count DESC
        LIMIT 10
      `;
      
      const topProductsResult = await prisma.$queryRawUnsafe<any[]>(
        topProductsQuery,
        ...dateValues
      );

      const topProducts = topProductsResult.map((product) => ({
        id: Number(product.id),
        productName: product.product_name || '',
        displayName: product.display_name || null,
        orderCount: Number(product.order_count || 0),
        totalRevenue: Number(product.total_revenue || 0),
        mainImage: product.main_image || null,
      }));

      // Top categories (by product count and revenue from products in category)
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
      if (categoryId) {
        topCategoriesQuery += ` WHERE c.id = ?`;
        categoryFilterParams.push(parseInt(categoryId));
      }
      
      if (dateFilter && !categoryId) {
        topCategoriesQuery += ` WHERE 1=1 ${dateFilter.replace('created_at', 'o.created_at')}`;
        categoryFilterParams.push(...dateValues);
      } else if (dateFilter && categoryId) {
        topCategoriesQuery += ` AND ${dateFilter.replace('created_at', 'o.created_at')}`;
        categoryFilterParams.push(...dateValues);
      }
      
      topCategoriesQuery += `
        GROUP BY c.id, c.category_name, c.product_count, c.main_image, c.parent, c.level
        HAVING product_count > 0
        ORDER BY product_count DESC, total_revenue DESC
        LIMIT 10
      `;
      
      const topCategoriesResult = await prisma.$queryRawUnsafe<any[]>(
        topCategoriesQuery,
        ...categoryFilterParams
      );

      const topCategories = topCategoriesResult.map((category) => ({
        id: Number(category.id),
        categoryName: category.category_name || '',
        productCount: Number(category.product_count || 0),
        totalRevenue: Number(category.total_revenue || 0),
        orderCount: Number(category.order_count || 0),
        mainImage: category.main_image || null,
        parent: category.parent !== null ? Number(category.parent) : null,
        level: Number(category.level || 0),
      }));

      // Fetch all categories for filter dropdown
      const allCategoriesQuery = `
        SELECT 
          id,
          category_name
        FROM category
        WHERE product_count > 0
        ORDER BY category_name ASC
        LIMIT 100
      `;
      const allCategoriesResult = await prisma.$queryRawUnsafe<Array<{ id: number; category_name: string }>>(
        allCategoriesQuery
      );
      const allCategories = allCategoriesResult.map((cat) => ({
        id: Number(cat.id),
        categoryName: cat.category_name || '',
      }));

      // Revenue by period (for charts)
      let revenueByPeriodQuery = '';
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

      revenueByPeriodQuery = `
        SELECT 
          ${groupByFormat} as period,
          COALESCE(SUM(total + shipping_amount), 0) as revenue,
          COUNT(*) as orders
        FROM orders
        ${dateFilter ? 'WHERE 1=1 ' + dateFilter : ''}
        GROUP BY ${groupByFormat}
        ORDER BY period DESC
        LIMIT 30
      `;

      const revenueByPeriodResult = await prisma.$queryRawUnsafe<Array<{ period: string; revenue: number; orders: bigint }>>(
        revenueByPeriodQuery,
        ...dateValues
      );

      const revenueByPeriod = revenueByPeriodResult.map((item) => ({
        period: item.period,
        revenue: Number(item.revenue || 0),
        orders: Number(item.orders || 0),
      }));

      // Registered users by type
      const userTypeBreakdownQuery = `
        SELECT 
          type,
          COUNT(*) as count
        FROM users
        GROUP BY type
      `;
      const userTypeBreakdownResult = await prisma.$queryRawUnsafe<Array<{ type: number; count: bigint }>>(
        userTypeBreakdownQuery
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

      // Registered users by period (using separate userPeriod parameter)
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

      // Get user registrations by period (only periods where users actually registered)
      // Show actual counts per period, not cumulative
      const registeredUsersQuery = `
        SELECT 
          ${userGroupByFormat} as period,
          SUM(CASE WHEN type = 3 THEN 1 ELSE 0 END) as normal_users,
          SUM(CASE WHEN type = 4 THEN 1 ELSE 0 END) as google_users,
          SUM(CASE WHEN type = 6 THEN 1 ELSE 0 END) as facebook_users,
          SUM(CASE WHEN type = 5 THEN 1 ELSE 0 END) as apple_users,
          COUNT(*) as total
        FROM users
        ${userDateFilter}
        GROUP BY ${userGroupByFormat}
        HAVING total > 0
        ORDER BY period ASC
      `;

      const registeredUsersResult = await prisma.$queryRawUnsafe<Array<{
        period: string;
        normal_users: bigint;
        google_users: bigint;
        facebook_users: bigint;
        apple_users: bigint;
        total: bigint;
      }>>(
        registeredUsersQuery,
        ...userDateValues
      );

      // Return actual counts per period (not cumulative)
      // Only include periods where at least one user registered
      const registeredUsers = registeredUsersResult.map((item) => ({
        period: item.period,
        normalUsers: Number(item.normal_users || 0),
        googleUsers: Number(item.google_users || 0),
        facebookUsers: Number(item.facebook_users || 0),
        appleUsers: Number(item.apple_users || 0),
        total: Number(item.total || 0),
      }));

      // Get currency symbol for consistent display
      // Note: We assume order prices are already in USD (converted at order time)
      const currencySymbol = getCurrencySymbol();

      const stats: DashboardStats = {
        totalOrders,
        totalRevenue,
        totalProducts,
        totalCategories,
        totalUsers,
        totalBrands,
        totalNotifications,
        ordersToday,
        ordersThisWeek,
        ordersThisMonth,
        revenueToday,
        revenueThisWeek,
        revenueThisMonth,
        orderStatusBreakdown,
        paidOrders,
        unpaidOrders,
        recentOrders,
        topProducts,
        topCategories,
        allCategories,
        revenueByPeriod,
        registeredUsers,
        userTypeBreakdown,
      };

      return NextResponse.json({
        success: true,
        stats,
        currencySymbol, // Added for consistent currency display
      });
    } catch (error) {
      console.error('DashboardController.index error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch dashboard statistics',
        },
        { status: 500 }
      );
    }
  }
}

