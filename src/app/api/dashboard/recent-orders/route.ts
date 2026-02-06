import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrencySymbol } from '@/lib/currency';

/**
 * GET /api/dashboard/recent-orders
 * Returns recent orders with their items
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const orderStatus = searchParams.get('order_status');
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
    let whereConditions: string[] = [];
    const params: any[] = [];
    
    if (start && end) {
      whereConditions.push('o.created_at BETWEEN ? AND ?');
      params.push(start, end);
    } else if (start) {
      whereConditions.push('o.created_at >= ?');
      params.push(start);
    } else if (end) {
      whereConditions.push('o.created_at <= ?');
      params.push(end);
    }

    if (orderStatus && orderStatus !== 'all') {
      whereConditions.push('o.status = ?');
      params.push(parseInt(orderStatus));
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Fetch recent orders
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
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ?
    `;
    
    params.push(limit);
    
    const recentOrdersResult = await prisma.$queryRawUnsafe<any[]>(
      recentOrdersQuery,
      ...params
    );

    // Fetch status names and order items in parallel for each order
    const recentOrders = await Promise.all(
      recentOrdersResult.map(async (order) => {
        // Fetch status name and order items in parallel
        const [statusResult, orderItemsResult] = await Promise.all([
          prisma.$queryRawUnsafe<Array<{ name: string }>>(
            `SELECT name FROM ag_list_options WHERE id = ? LIMIT 1`,
            order.status
          ).catch(() => []),
          prisma.$queryRawUnsafe<any[]>(
            `SELECT op.id, op.product_name, op.product_code, op.quantity, op.product_price, p.main_image FROM order_products op LEFT JOIN product p ON op.r_product_id = p.id WHERE op.r_order_id = ? LIMIT 5`,
            order.id
          ),
        ]);

        const statusName = statusResult.length > 0 ? statusResult[0].name : `Status ${order.status}`;
        
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

    // Get currency symbol for consistent display
    // Note: Order prices are assumed to be in USD (converted at order time)
    const currencySymbol = getCurrencySymbol();

    return NextResponse.json({
      success: true,
      recentOrders,
      currencySymbol, // Added for consistent currency display
    });
  } catch (error) {
    console.error('Dashboard recent orders error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch recent orders',
      },
      { status: 500 }
    );
  }
}

