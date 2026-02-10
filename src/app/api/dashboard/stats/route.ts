import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Run all queries in parallel
    const [
      totalProducts,
      totalCustomers,
      totalOrders,
      totalCoupons,
      // Revenue
      totalRevenueResult,
      thisMonthRevenueResult,
      lastMonthRevenueResult,
      // Orders this/last month
      ordersThisMonth,
      ordersLastMonth,
      // Customers this/last month
      customersThisMonth,
      customersLastMonth,
      // Orders by status
      ordersByStatus,
      // Monthly revenue (current year)
      monthlyRevenue,
      // Recent orders
      recentOrders,
      // Top products by order count
      topProducts,
      // Orders by payment type
      ordersByPaymentType,
      // Daily orders (last 30 days)
      dailyOrders,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.users.count(),
      prisma.orders.count(),
      prisma.coupon_code.count(),
      // Total revenue (all time, paid orders)
      prisma.orders.aggregate({ _sum: { total: true }, where: { is_paid: 1 } }),
      // This month revenue
      prisma.orders.aggregate({
        _sum: { total: true },
        where: { is_paid: 1, created_at: { gte: thisMonthStart } },
      }),
      // Last month revenue
      prisma.orders.aggregate({
        _sum: { total: true },
        where: { is_paid: 1, created_at: { gte: lastMonthStart, lte: lastMonthEnd } },
      }),
      // Orders this month
      prisma.orders.count({ where: { created_at: { gte: thisMonthStart } } }),
      // Orders last month
      prisma.orders.count({
        where: { created_at: { gte: lastMonthStart, lte: lastMonthEnd } },
      }),
      // Customers this month
      prisma.users.count({ where: { created_at: { gte: thisMonthStart } } }),
      // Customers last month
      prisma.users.count({
        where: { created_at: { gte: lastMonthStart, lte: lastMonthEnd } },
      }),
      // Orders grouped by status
      prisma.orders.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      // Monthly revenue for the year
      prisma.$queryRaw`
        SELECT 
          MONTH(created_at) as month,
          SUM(total) as revenue,
          COUNT(id) as order_count
        FROM orders 
        WHERE created_at >= ${yearStart} AND is_paid = 1
        GROUP BY MONTH(created_at)
        ORDER BY month ASC
      ` as Promise<Array<{ month: number; revenue: number; order_count: number }>>,
      // Recent orders (last 10)
      prisma.orders.findMany({
        take: 10,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          total: true,
          status: true,
          address_first_name: true,
          address_last_name: true,
          quantity: true,
          created_at: true,
          is_paid: true,
          payment_type: true,
        },
      }),
      // Top 10 products by order count
      prisma.$queryRaw`
        SELECT p.id, p.product_name, p.display_name, p.main_image, p.product_price, p.sale_price,
               COUNT(DISTINCT op.r_order_id) as order_count
        FROM product p
        JOIN order_products op ON op.r_product_id = p.id
        GROUP BY p.id, p.product_name, p.display_name, p.main_image, p.product_price, p.sale_price
        ORDER BY order_count DESC
        LIMIT 10
      ` as Promise<Array<{
        id: number;
        product_name: string;
        display_name: string | null;
        main_image: string | null;
        product_price: number;
        sale_price: number | null;
        order_count: number;
      }>>,
      // Orders by payment type
      prisma.orders.groupBy({
        by: ["payment_type"],
        _count: { id: true },
        _sum: { total: true },
      }),
      // Daily orders last 30 days
      prisma.$queryRaw`
        SELECT DATE(created_at) as date, COUNT(id) as count, SUM(total) as revenue
        FROM orders
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      ` as Promise<Array<{ date: string; count: number; revenue: number }>>,
    ]);

    // Calculate percentage changes
    const totalRevenue = totalRevenueResult._sum.total || 0;
    const thisMonthRev = thisMonthRevenueResult._sum.total || 0;
    const lastMonthRev = lastMonthRevenueResult._sum.total || 0;
    const revenueChange = lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100 : 0;
    const ordersChange = ordersLastMonth > 0 ? ((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100 : 0;
    const customersChange = customersLastMonth > 0 ? ((customersThisMonth - customersLastMonth) / customersLastMonth) * 100 : 0;

    // Map status codes to labels
    const statusLabels: Record<number, string> = {
      0: "Pending",
      1: "Processing",
      2: "Shipped",
      3: "Delivered",
      4: "Cancelled",
      5: "Returned",
      6: "Refunded",
      7: "On Hold",
      8: "Failed",
      9: "New",
      10: "Confirmed",
    };

    const paymentLabels: Record<number, string> = {
      0: "Cash on Delivery",
      1: "Credit Card",
      2: "Whish Money",
      3: "Bank Transfer",
    };

    // Format monthly revenue data (fill gaps)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyRevenueFormatted = months.map((name, i) => {
      const found = (monthlyRevenue as Array<{ month: number; revenue: number; order_count: number }>).find(
        (m) => Number(m.month) === i + 1
      );
      return {
        name,
        revenue: found ? Number(found.revenue) : 0,
        orders: found ? Number(found.order_count) : 0,
      };
    });

    return NextResponse.json({
      stats: {
        totalRevenue,
        thisMonthRevenue: thisMonthRev,
        revenueChange: Math.round(revenueChange * 10) / 10,
        totalOrders,
        ordersThisMonth,
        ordersChange: Math.round(ordersChange * 10) / 10,
        totalProducts,
        totalCustomers,
        customersThisMonth,
        customersChange: Math.round(customersChange * 10) / 10,
        totalCoupons,
      },
      charts: {
        monthlyRevenue: monthlyRevenueFormatted,
        ordersByStatus: ordersByStatus.map((s) => ({
          name: statusLabels[s.status] || `Status ${s.status}`,
          value: s._count.id,
          status: s.status,
        })),
        ordersByPaymentType: ordersByPaymentType.map((p) => ({
          name: paymentLabels[p.payment_type] || `Type ${p.payment_type}`,
          count: p._count.id,
          revenue: p._sum.total || 0,
        })),
        dailyOrders: (dailyOrders as Array<{ date: string; count: number; revenue: number }>).map((d) => ({
          date: d.date,
          orders: Number(d.count),
          revenue: Number(d.revenue),
        })),
      },
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        customer: `${o.address_first_name} ${o.address_last_name}`,
        total: o.total,
        status: statusLabels[o.status] || `Status ${o.status}`,
        statusCode: o.status,
        quantity: o.quantity,
        isPaid: o.is_paid === 1,
        paymentType: paymentLabels[o.payment_type] || `Type ${o.payment_type}`,
        createdAt: o.created_at,
      })),
      topProducts: (topProducts as Array<{
        id: number;
        product_name: string;
        display_name: string | null;
        main_image: string | null;
        product_price: number;
        sale_price: number | null;
        order_count: number;
      }>).map((p) => ({
        id: p.id,
        name: p.display_name || p.product_name,
        image: p.main_image,
        price: p.sale_price || p.product_price,
        orders: Number(p.order_count),
      })),
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
