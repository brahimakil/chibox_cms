import { prisma } from '@/lib/db';

// Order interface matching PHP backend structure (v3.0.0)
export interface Order {
  id: number;
  order_number: string; // Formatted as "ORD-00000001"
  status: string; // Status name
  status_id: number;
  subtotal: number;
  shipping_amount: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  currency_id: number;
  currency_symbol: string;
  quantity: number;
  is_paid: number;
  payment_type: string; // Payment type name
  payment_type_id: number;
  payment_id: string | null;
  address: OrderAddress;
  client_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  products: OrderProduct[];
  tracking: OrderTrackingEntry[];
  // Additional fields for enriched data
  userName?: string | null;
}

// Legacy Order interface for backward compatibility with existing list views
export interface OrderLegacy {
  id: number;
  rUserId: number;
  total: number;
  quantity: number;
  addressFirstName: string;
  addressLastName: string;
  addressCountryCode: string;
  addressPhoneNumber: string;
  address: string;
  country: string;
  city: string;
  state: string | null;
  routeName: string;
  buildingName: string;
  floorNumber: number;
  status: number;
  shippingAmount: number;
  clientNotes: string | null;
  notes: string | null;
  additionalDetails: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  lockedBy: number | null;
  createdBy: number | null;
  updatedBy: number | null;
  isPaid: number;
  paymentType: number;
  paymentId: string | null;
  couponCode: number | null;
  rDeliveryCompanyId: number | null;
  branchId: number | null;
  pickUpDate: Date | null;
  // Enriched fields (optional, populated when available)
  userName?: string | null;
  statusName?: string | null;
  paymentMethodName?: string | null;
  products?: OrderProductLegacy[];
}

// Legacy OrderProduct interface (for backward compatibility)
export interface OrderProductLegacy {
  id: number;
  rOrderId: number;
  rProductId: number;
  productCode: string;
  productName: string;
  model: string | null;
  brand: number | null;
  providerPrice: number;
  productPrice: number;
  quantity: number;
  productCost: number | null;
  profit: number;
  productCondition: number | null;
  discount: number | null;
  shipping: number | null;
  mainImage?: string | null;
}

// Product Variation in Order (matching PHP backend)
export interface OrderProductVariation {
  option_name: string | null;
  value_name: string | null;
  is_color: number;
  color: string | null;
  image_url: string | null;
  pid: string | null;
  vid: string | null;
}

// Order Product interface matching PHP backend structure
export interface OrderProduct {
  id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  source_product_id: string | null;
  sku_id: string | null;
  variation_name: string | null;
  props_ids: string | null;
  main_image: string | null;
  variation_image: string | null;
  quantity: number;
  price: number;
  total: number;
  variations: OrderProductVariation[];
}

// Order Tracking entry (matching PHP backend)
export interface OrderTrackingEntry {
  status: string;
  status_id: number;
  date: string;
}

// Order Address (nested object matching PHP backend)
export interface OrderAddress {
  first_name: string;
  last_name: string;
  country_code: string;
  phone_number: string;
  address: string;
  country: string;
  city: string;
  state: string | null;
  route_name: string;
  building_name: string;
  floor_number: number;
}

export interface CreateOrderData {
  r_user_id: number;
  total: number;
  quantity: number;
  address_first_name: string;
  address_last_name: string;
  address_country_code: string;
  address_phone_number: string;
  address: string;
  country: string;
  city: string;
  route_name: string;
  building_name: string;
  floor_number: number;
  shipping_amount: number;
  payment_type: number;
  state?: string | null;
  client_notes?: string | null;
  notes?: string | null;
  additional_details?: string | null;
  status?: number;
  is_paid?: number;
  payment_id?: string | null;
  coupon_code?: number | null;
  r_delivery_company_id?: number | null;
  branch_id?: number | null;
  pick_up_date?: Date | null;
}

export interface OrderListResponse {
  success: boolean;
  total: number;
  orders: OrderLegacy[];
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface OrderResponse {
  success: boolean;
  order?: Order;
  message?: string;
  error?: string;
}

export interface OrderLegacyResponse {
  success: boolean;
  order?: OrderLegacy;
  message?: string;
  error?: string;
}

// Create/Update operations return legacy format
export interface OrderMutationResponse {
  success: boolean;
  order?: OrderLegacy;
  message?: string;
  error?: string;
}

export class OrderModel {
  /**
   * Fetch all orders with optional pagination and filters
   */
  static async findAll(params?: {
    r_user_id?: number;
    status?: number;
    is_paid?: number;
    payment_type?: number;
    page?: number;
    limit?: number;
    search?: string;
    // Column filters
    id?: string;
    total?: string;
    quantity?: string;
    sort?: string[];
    enriched?: boolean; // If true, include names for users, status, payment methods
  }): Promise<OrderListResponse> {
    try {
      // Enforce pagination - default to page 1, limit 50
      const page = params?.page || 1;
      const limit = params?.limit || 50;

      // Build WHERE conditions using MySQL placeholders (?)
      const conditions: string[] = [];
      const values: any[] = [];

      if (params?.r_user_id) {
        conditions.push(`r_user_id = ?`);
        values.push(params.r_user_id);
      }

      if (params?.status !== undefined) {
        conditions.push(`status = ?`);
        values.push(params.status);
      }

      if (params?.is_paid !== undefined) {
        conditions.push(`is_paid = ?`);
        values.push(params.is_paid);
      }

      if (params?.payment_type !== undefined) {
        conditions.push(`payment_type = ?`);
        values.push(params.payment_type);
      }

      if (params?.search) {
        // Search in address fields, customer name, etc.
        conditions.push(`(
          LOWER(address_first_name) LIKE LOWER(?) OR 
          LOWER(address_last_name) LIKE LOWER(?) OR
          LOWER(address) LIKE LOWER(?) OR
          LOWER(city) LIKE LOWER(?) OR
          LOWER(country) LIKE LOWER(?)
        )`);
        const searchPattern = `%${params.search}%`;
        values.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }

      // Column filters
      if (params?.id) {
        // Support exact match or range (e.g., "5" or "5-10")
        if (params.id.includes('-')) {
          const [min, max] = params.id.split('-').map(v => v.trim());
          if (min && max) {
            conditions.push(`id >= ? AND id <= ?`);
            values.push(parseInt(min), parseInt(max));
          } else if (min) {
            conditions.push(`id >= ?`);
            values.push(parseInt(min));
          }
        } else {
          conditions.push(`id = ?`);
          values.push(parseInt(params.id));
        }
      }

      if (params?.total) {
        // Support exact match or range
        if (params.total.includes('-')) {
          const [min, max] = params.total.split('-').map(v => v.trim());
          if (min && max) {
            conditions.push(`total >= ? AND total <= ?`);
            values.push(parseFloat(min), parseFloat(max));
          } else if (min) {
            conditions.push(`total >= ?`);
            values.push(parseFloat(min));
          }
        } else {
          conditions.push(`total = ?`);
          values.push(parseFloat(params.total));
        }
      }

      if (params?.quantity) {
        // Support exact match or range
        if (params.quantity.includes('-')) {
          const [min, max] = params.quantity.split('-').map(v => v.trim());
          if (min && max) {
            conditions.push(`quantity >= ? AND quantity <= ?`);
            values.push(parseInt(min), parseInt(max));
          } else if (min) {
            conditions.push(`quantity >= ?`);
            values.push(parseInt(min));
          }
        } else {
          conditions.push(`quantity = ?`);
          values.push(parseInt(params.quantity));
        }
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM orders ${whereClause}`;
      const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        countQuery,
        ...values
      );
      const total = Number(countResult[0]?.count || 0);

      // Build ORDER BY clause from sort parameters
      const columnMap: Record<string, string> = {
        'id': 'id',
        'total': 'total',
        'quantity': 'quantity',
        'status': 'status',
        'is_paid': 'is_paid',
        'payment_type': 'payment_type',
        'created_at': 'created_at',
        'updated_at': 'updated_at',
        'r_user_id': 'r_user_id',
      };

      let orderByClause = '';
      if (params?.sort && params.sort.length > 0) {
        const orderByParts: string[] = [];
        params.sort.forEach((sortParam) => {
          const [column, direction] = sortParam.split(':');
          const dbColumn = columnMap[column] || column;
          const sortDirection = direction?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
          // Validate column name to prevent SQL injection
          if (columnMap[column] || /^[a-z_]+$/.test(column)) {
            orderByParts.push(`${dbColumn} ${sortDirection}`);
          }
        });
        if (orderByParts.length > 0) {
          orderByClause = `ORDER BY ${orderByParts.join(', ')}`;
        }
      }
      
      // Default sorting if no sort parameters provided
      if (!orderByClause) {
        orderByClause = 'ORDER BY id DESC';
      }

      // Build query with date casting to handle invalid dates
      const offset = (page - 1) * limit;
      const query = `SELECT 
        id, r_user_id, total, quantity,
        address_first_name, address_last_name, address_country_code, address_phone_number,
        address, country, city, state, route_name, building_name, floor_number,
        status, shipping_amount, client_notes, notes, additional_details,
        locked_by, created_by, updated_by,
        CAST(created_at AS CHAR) as created_at,
        CAST(updated_at AS CHAR) as updated_at,
        is_paid, payment_type, payment_id, coupon_code,
        r_delivery_company_id, branch_id,
        CAST(pick_up_date AS CHAR) as pick_up_date
      FROM orders ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`;
      
      const queryValues = [...values, limit, offset];

      // Use raw query to handle invalid dates gracefully
      const rawOrders = await prisma.$queryRawUnsafe<any[]>(query, ...queryValues);

      // Transform raw results to match OrderLegacy interface
      let orders: OrderLegacy[] = rawOrders.map((row: any) => ({
        id: Number(row.id),
        rUserId: Number(row.r_user_id),
        total: Number(row.total || 0),
        quantity: Number(row.quantity || 0),
        addressFirstName: row.address_first_name || '',
        addressLastName: row.address_last_name || '',
        addressCountryCode: row.address_country_code || '',
        addressPhoneNumber: row.address_phone_number || '',
        address: row.address || '',
        country: row.country || '',
        city: row.city || '',
        state: row.state || null,
        routeName: row.route_name || '',
        buildingName: row.building_name || '',
        floorNumber: Number(row.floor_number || 0),
        status: Number(row.status || 0),
        shippingAmount: Number(row.shipping_amount || 0),
        clientNotes: row.client_notes || null,
        notes: row.notes || null,
        additionalDetails: row.additional_details || null,
        createdAt: this.parseDate(row.created_at),
        updatedAt: this.parseDate(row.updated_at),
        lockedBy: row.locked_by ? Number(row.locked_by) : null,
        createdBy: row.created_by ? Number(row.created_by) : null,
        updatedBy: row.updated_by ? Number(row.updated_by) : null,
        isPaid: Number(row.is_paid || 0),
        paymentType: Number(row.payment_type || 0),
        paymentId: row.payment_id || null,
        couponCode: row.coupon_code ? Number(row.coupon_code) : null,
        rDeliveryCompanyId: row.r_delivery_company_id ? Number(row.r_delivery_company_id) : null,
        branchId: row.branch_id ? Number(row.branch_id) : null,
        pickUpDate: this.parseDate(row.pick_up_date),
      }));

      // Enrich orders with names and products if requested
      if (params?.enriched) {
        orders = await Promise.all(
          orders.map(order => this.enrichOrder(order))
        );
      }

      // Always fetch products for orders
      const orderIds = orders.map(o => o.id);
      if (orderIds.length > 0) {
        const productsMap = await this.fetchOrderProducts(orderIds);
        orders = orders.map(order => ({
          ...order,
          products: productsMap.get(order.id) || [],
        }));
      }

      return {
        success: true,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        orders,
      };
    } catch (error) {
      console.error('[OrderModel] findAll error:', error);
      throw error;
    }
  }

  /**
   * Enrich order with names (user name, status name, payment method name)
   */
  static async enrichOrder(order: OrderLegacy): Promise<OrderLegacy & {
    userName?: string | null;
    statusName?: string | null;
    paymentMethodName?: string | null;
  }> {
    const enriched: any = { ...order };

    // Fetch user name if rUserId exists
    if (order.rUserId) {
      try {
        const userResult = await prisma.$queryRawUnsafe<any[]>(
          `SELECT id, first_name, last_name, email FROM users WHERE id = ? LIMIT 1`,
          order.rUserId
        );
        if (userResult && userResult.length > 0) {
          const user = userResult[0];
          enriched.userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || `User ${user.id}`;
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
      }
    }

    // Fetch status name (assuming there's an ag_list_options table for status)
    if (order.status) {
      try {
        const statusResult = await prisma.$queryRawUnsafe<any[]>(
          `SELECT name FROM ag_list_options WHERE id = ? LIMIT 1`,
          order.status
        );
        if (statusResult && statusResult.length > 0) {
          enriched.statusName = statusResult[0].name || `Status ${order.status}`;
        }
      } catch (error) {
        console.error('Error fetching status name:', error);
      }
    }

    // Fetch payment method name
    if (order.paymentType) {
      try {
        const paymentResult = await prisma.$queryRawUnsafe<any[]>(
          `SELECT name FROM payment_methods WHERE id = ? LIMIT 1`,
          order.paymentType
        );
        if (paymentResult && paymentResult.length > 0) {
          enriched.paymentMethodName = paymentResult[0].name || `Payment ${order.paymentType}`;
        }
      } catch (error) {
        console.error('Error fetching payment method name:', error);
      }
    }

    return enriched;
  }

  /**
   * Fetch order products for multiple orders (legacy format)
   */
  static async fetchOrderProducts(orderIds: number[]): Promise<Map<number, OrderProductLegacy[]>> {
    const productsMap = new Map<number, OrderProductLegacy[]>();
    
    if (orderIds.length === 0) {
      return productsMap;
    }

    try {
      // Create placeholders for IN clause
      const placeholders = orderIds.map(() => '?').join(',');
      
      // Fetch order products with product main image
      const query = `
        SELECT 
          op.id,
          op.r_order_id,
          op.r_product_id,
          op.product_code,
          op.product_name,
          op.model,
          op.brand,
          op.provider_price,
          op.product_price,
          op.quantity,
          op.product_cost,
          op.profit,
          op.product_condition,
          op.discount,
          op.shipping,
          p.main_image
        FROM order_products op
        LEFT JOIN product p ON op.r_product_id = p.id
        WHERE op.r_order_id IN (${placeholders})
        ORDER BY op.r_order_id, op.id
      `;
      
      const rawProducts = await prisma.$queryRawUnsafe<any[]>(query, ...orderIds);
      
      // Group products by order ID
      rawProducts.forEach((row: any) => {
        const orderId = Number(row.r_order_id);
        if (!productsMap.has(orderId)) {
          productsMap.set(orderId, []);
        }
        
        const products = productsMap.get(orderId)!;
        products.push({
          id: Number(row.id),
          rOrderId: orderId,
          rProductId: Number(row.r_product_id),
          productCode: row.product_code || '',
          productName: row.product_name || '',
          model: row.model || null,
          brand: row.brand ? Number(row.brand) : null,
          providerPrice: Number(row.provider_price || 0),
          productPrice: Number(row.product_price || 0),
          quantity: Number(row.quantity || 0),
          productCost: row.product_cost ? Number(row.product_cost) : null,
          profit: Number(row.profit || 0),
          productCondition: row.product_condition ? Number(row.product_condition) : null,
          discount: row.discount ? Number(row.discount) : null,
          shipping: row.shipping ? Number(row.shipping) : null,
          mainImage: row.main_image || null,
        });
      });
    } catch (error) {
      console.error('[OrderModel] Error fetching order products:', error);
    }

    return productsMap;
  }

  /**
   * Parse date string, handling invalid dates gracefully
   */
  private static parseDate(dateValue: any): Date | null {
    if (!dateValue) return null;
    
    try {
      // If it's already a Date object
      if (dateValue instanceof Date) {
        // Check if it's a valid date
        if (isNaN(dateValue.getTime())) {
          return null;
        }
        return dateValue;
      }

      // If it's a string, try to parse it
      if (typeof dateValue === 'string') {
        // Handle MySQL zero dates (0000-00-00 00:00:00)
        if (dateValue.startsWith('0000-00-00') || dateValue.includes('0000-00-00')) {
          return null;
        }
        
        const parsed = new Date(dateValue);
        if (isNaN(parsed.getTime())) {
          return null;
        }
        return parsed;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Find order by ID (legacy format for backward compatibility)
   */
  static async findById(id: number): Promise<OrderLegacy | null> {
    try {
      const rawOrders = await prisma.$queryRawUnsafe<any[]>(
        `SELECT 
          id, r_user_id, total, quantity,
          address_first_name, address_last_name, address_country_code, address_phone_number,
          address, country, city, state, route_name, building_name, floor_number,
          status, shipping_amount, client_notes, notes, additional_details,
          locked_by, created_by, updated_by,
          CAST(created_at AS CHAR) as created_at,
          CAST(updated_at AS CHAR) as updated_at,
          is_paid, payment_type, payment_id, coupon_code,
          r_delivery_company_id, branch_id,
          CAST(pick_up_date AS CHAR) as pick_up_date
        FROM orders WHERE id = ? LIMIT 1`,
        id
      );

      if (!rawOrders || rawOrders.length === 0) {
        return null;
      }

      const row = rawOrders[0];
      
      return {
        id: Number(row.id),
        rUserId: Number(row.r_user_id),
        total: Number(row.total || 0),
        quantity: Number(row.quantity || 0),
        addressFirstName: row.address_first_name || '',
        addressLastName: row.address_last_name || '',
        addressCountryCode: row.address_country_code || '',
        addressPhoneNumber: row.address_phone_number || '',
        address: row.address || '',
        country: row.country || '',
        city: row.city || '',
        state: row.state || null,
        routeName: row.route_name || '',
        buildingName: row.building_name || '',
        floorNumber: Number(row.floor_number || 0),
        status: Number(row.status || 0),
        shippingAmount: Number(row.shipping_amount || 0),
        clientNotes: row.client_notes || null,
        notes: row.notes || null,
        additionalDetails: row.additional_details || null,
        createdAt: this.parseDate(row.created_at),
        updatedAt: this.parseDate(row.updated_at),
        lockedBy: row.locked_by ? Number(row.locked_by) : null,
        createdBy: row.created_by ? Number(row.created_by) : null,
        updatedBy: row.updated_by ? Number(row.updated_by) : null,
        isPaid: Number(row.is_paid || 0),
        paymentType: Number(row.payment_type || 0),
        paymentId: row.payment_id || null,
        couponCode: row.coupon_code ? Number(row.coupon_code) : null,
        rDeliveryCompanyId: row.r_delivery_company_id ? Number(row.r_delivery_company_id) : null,
        branchId: row.branch_id ? Number(row.branch_id) : null,
        pickUpDate: this.parseDate(row.pick_up_date),
      };
    } catch (error) {
      console.error('OrderModel.findById error:', error);
      throw error;
    }
  }

  /**
   * Find order by ID with detailed data (matching PHP backend v3.0.0 structure)
   */
  static async findByIdDetailed(id: number): Promise<Order | null> {
    try {
      // Get order basic data
      const rawOrders = await prisma.$queryRawUnsafe<any[]>(
        `SELECT 
          o.id, o.r_user_id, o.total, o.quantity,
          o.address_first_name, o.address_last_name, o.address_country_code, o.address_phone_number,
          o.address, o.country, o.city, o.state, o.route_name, o.building_name, o.floor_number,
          o.status, o.shipping_amount, o.client_notes, o.notes, o.additional_details,
          CAST(o.created_at AS CHAR) as created_at,
          CAST(o.updated_at AS CHAR) as updated_at,
          o.is_paid, o.payment_type, o.payment_id,
          COALESCE(o.subtotal, o.total) as subtotal,
          COALESCE(o.tax_amount, 0) as tax_amount,
          COALESCE(o.discount_amount, 0) as discount_amount,
          COALESCE(o.currency_id, 6) as currency_id,
          alo.name as status_name,
          pm.name as payment_method_name,
          CONCAT(u.first_name, ' ', u.last_name) as user_name
        FROM orders o
        LEFT JOIN ag_list_options alo ON o.status = alo.id
        LEFT JOIN payment_methods pm ON o.payment_type = pm.id
        LEFT JOIN users u ON o.r_user_id = u.id
        WHERE o.id = ? LIMIT 1`,
        id
      );

      if (!rawOrders || rawOrders.length === 0) {
        return null;
      }

      const row = rawOrders[0];
      
      // Get order products with their variations
      const orderProducts = await prisma.$queryRawUnsafe<any[]>(
        `SELECT 
          op.id,
          op.r_product_id,
          op.product_code,
          op.product_name,
          op.source_product_id,
          op.sku_id,
          op.variation_name,
          op.props_ids,
          COALESCE(op.main_image, p.main_image) as main_image,
          op.variation_image,
          op.quantity,
          op.product_price,
          op.provider_price
        FROM order_products op
        LEFT JOIN product p ON op.r_product_id = p.id
        WHERE op.r_order_id = ?
        ORDER BY op.id`,
        id
      );

      // Format products with variations
      const formattedProducts: OrderProduct[] = [];
      for (const op of orderProducts) {
        // Get variations for this order product
        const variations = await prisma.$queryRawUnsafe<any[]>(
          `SELECT 
            option_name,
            value_name,
            is_color,
            color,
            image_url,
            pid,
            vid
          FROM order_product_variation
          WHERE r_order_product_id = ?`,
          op.id
        );

        const formattedVariations: OrderProductVariation[] = variations.map((v: any) => ({
          option_name: v.option_name || null,
          value_name: v.value_name || null,
          is_color: Number(v.is_color || 0),
          color: v.color || null,
          image_url: v.image_url || null,
          pid: v.pid || null,
          vid: v.vid || null,
        }));

        const price = Number(op.product_price || 0);
        const quantity = Number(op.quantity || 0);

        formattedProducts.push({
          id: Number(op.id),
          product_id: Number(op.r_product_id),
          product_code: op.product_code || '',
          product_name: op.product_name || '',
          source_product_id: op.source_product_id || null,
          sku_id: op.sku_id || null,
          variation_name: op.variation_name || null,
          props_ids: op.props_ids || null,
          main_image: op.main_image || null,
          variation_image: op.variation_image || null,
          quantity: quantity,
          price: price,
          total: price * quantity,
          variations: formattedVariations,
        });
      }

      // Get order tracking history
      const trackingHistory = await prisma.$queryRawUnsafe<any[]>(
        `SELECT 
          ot.r_status_id,
          CAST(ot.track_date AS CHAR) as track_date,
          alo.name as status_name
        FROM order_tracking ot
        LEFT JOIN ag_list_options alo ON ot.r_status_id = alo.id
        WHERE ot.r_order_id = ?
        ORDER BY ot.track_date DESC, ot.id DESC`,
        id
      );

      const formattedTracking: OrderTrackingEntry[] = trackingHistory.map((t: any) => ({
        status: t.status_name || `Status ${t.r_status_id}`,
        status_id: Number(t.r_status_id),
        date: t.track_date || '',
      }));

      // Format order number
      const orderNumber = `ORD-${String(row.id).padStart(8, '0')}`;

      return {
        id: Number(row.id),
        order_number: orderNumber,
        status: row.status_name || `Status ${row.status}`,
        status_id: Number(row.status || 0),
        subtotal: Number(row.subtotal || 0),
        shipping_amount: Number(row.shipping_amount || 0),
        tax_amount: Number(row.tax_amount || 0),
        discount_amount: Number(row.discount_amount || 0),
        total: Number(row.total || 0),
        currency_id: Number(row.currency_id || 6),
        currency_symbol: '$', // TODO: Get from currency table
        quantity: Number(row.quantity || 0),
        is_paid: Number(row.is_paid || 0),
        payment_type: row.payment_method_name || `Payment ${row.payment_type}`,
        payment_type_id: Number(row.payment_type || 0),
        payment_id: row.payment_id || null,
        address: {
          first_name: row.address_first_name || '',
          last_name: row.address_last_name || '',
          country_code: row.address_country_code || '',
          phone_number: row.address_phone_number || '',
          address: row.address || '',
          country: row.country || '',
          city: row.city || '',
          state: row.state || null,
          route_name: row.route_name || '',
          building_name: row.building_name || '',
          floor_number: Number(row.floor_number || 0),
        },
        client_notes: row.client_notes || null,
        created_at: row.created_at || null,
        updated_at: row.updated_at || null,
        products: formattedProducts,
        tracking: formattedTracking,
        userName: row.user_name || null,
      };
    } catch (error) {
      console.error('OrderModel.findByIdDetailed error:', error);
      throw error;
    }
  }

  /**
   * Create a new order
   */
  static async create(data: CreateOrderData): Promise<OrderMutationResponse> {
    try {
      // Use raw SQL to ensure proper column name mapping
      const insertQuery = `
        INSERT INTO orders (
          r_user_id, total, quantity,
          address_first_name, address_last_name, address_country_code, address_phone_number,
          address, country, city, state, route_name, building_name, floor_number,
          status, shipping_amount, client_notes, notes, additional_details,
          is_paid, payment_type, payment_id, coupon_code,
          r_delivery_company_id, branch_id, pick_up_date,
          created_by, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
        )
      `;

      const values = [
        data.r_user_id,
        data.total,
        data.quantity,
        data.address_first_name,
        data.address_last_name,
        data.address_country_code,
        data.address_phone_number,
        data.address,
        data.country,
        data.city,
        data.state ?? null,
        data.route_name,
        data.building_name,
        data.floor_number,
        data.status ?? 0,
        data.shipping_amount,
        data.client_notes ?? null,
        data.notes ?? null,
        data.additional_details ?? null,
        data.is_paid ?? 0,
        data.payment_type,
        data.payment_id ?? null,
        data.coupon_code ?? null,
        data.r_delivery_company_id ?? null,
        data.branch_id ?? null,
        data.pick_up_date ?? null,
        1, // created_by - TODO: Get from auth context
      ];

      // Execute raw SQL insert
      await prisma.$executeRawUnsafe(insertQuery, ...values);

      // Get the last inserted ID
      const idResult = await prisma.$queryRawUnsafe<Array<{ id: bigint }>>(
        `SELECT LAST_INSERT_ID() as id`
      );

      if (!idResult || idResult.length === 0 || !idResult[0].id) {
        return {
          success: false,
          error: 'Failed to retrieve created order ID',
        };
      }

      const orderId = Number(idResult[0].id);
      const order = await this.findById(orderId);

      if (!order) {
        return {
          success: false,
          error: 'Failed to retrieve created order',
        };
      }

      return {
        success: true,
        order: order!,
        message: 'Order created successfully',
      };
    } catch (error) {
      console.error('OrderModel.create error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order',
      };
    }
  }

  /**
   * Update order
   */
  static async update(id: number, data: Partial<CreateOrderData>): Promise<OrderMutationResponse> {
    try {
      // Build UPDATE query using raw SQL
      const updateFields: string[] = [];
      const values: any[] = [];

      if (data.r_user_id !== undefined) {
        updateFields.push('r_user_id = ?');
        values.push(data.r_user_id);
      }
      if (data.total !== undefined) {
        updateFields.push('total = ?');
        values.push(data.total);
      }
      if (data.quantity !== undefined) {
        updateFields.push('quantity = ?');
        values.push(data.quantity);
      }
      if (data.address_first_name !== undefined) {
        updateFields.push('address_first_name = ?');
        values.push(data.address_first_name);
      }
      if (data.address_last_name !== undefined) {
        updateFields.push('address_last_name = ?');
        values.push(data.address_last_name);
      }
      if (data.address_country_code !== undefined) {
        updateFields.push('address_country_code = ?');
        values.push(data.address_country_code);
      }
      if (data.address_phone_number !== undefined) {
        updateFields.push('address_phone_number = ?');
        values.push(data.address_phone_number);
      }
      if (data.address !== undefined) {
        updateFields.push('address = ?');
        values.push(data.address);
      }
      if (data.country !== undefined) {
        updateFields.push('country = ?');
        values.push(data.country);
      }
      if (data.city !== undefined) {
        updateFields.push('city = ?');
        values.push(data.city);
      }
      if (data.state !== undefined) {
        if (data.state === null) {
          updateFields.push('state = NULL');
        } else {
          updateFields.push('state = ?');
          values.push(data.state);
        }
      }
      if (data.route_name !== undefined) {
        updateFields.push('route_name = ?');
        values.push(data.route_name);
      }
      if (data.building_name !== undefined) {
        updateFields.push('building_name = ?');
        values.push(data.building_name);
      }
      if (data.floor_number !== undefined) {
        updateFields.push('floor_number = ?');
        values.push(data.floor_number);
      }
      if (data.status !== undefined) {
        updateFields.push('status = ?');
        values.push(data.status);
      }
      if (data.shipping_amount !== undefined) {
        updateFields.push('shipping_amount = ?');
        values.push(data.shipping_amount);
      }
      if (data.client_notes !== undefined) {
        if (data.client_notes === null) {
          updateFields.push('client_notes = NULL');
        } else {
          updateFields.push('client_notes = ?');
          values.push(data.client_notes);
        }
      }
      if (data.notes !== undefined) {
        if (data.notes === null) {
          updateFields.push('notes = NULL');
        } else {
          updateFields.push('notes = ?');
          values.push(data.notes);
        }
      }
      if (data.additional_details !== undefined) {
        if (data.additional_details === null) {
          updateFields.push('additional_details = NULL');
        } else {
          updateFields.push('additional_details = ?');
          values.push(data.additional_details);
        }
      }
      if (data.is_paid !== undefined) {
        updateFields.push('is_paid = ?');
        values.push(data.is_paid);
      }
      if (data.payment_type !== undefined) {
        updateFields.push('payment_type = ?');
        values.push(data.payment_type);
      }
      if (data.payment_id !== undefined) {
        if (data.payment_id === null) {
          updateFields.push('payment_id = NULL');
        } else {
          updateFields.push('payment_id = ?');
          values.push(data.payment_id);
        }
      }
      if (data.coupon_code !== undefined) {
        if (data.coupon_code === null) {
          updateFields.push('coupon_code = NULL');
        } else {
          updateFields.push('coupon_code = ?');
          values.push(data.coupon_code);
        }
      }
      if (data.r_delivery_company_id !== undefined) {
        if (data.r_delivery_company_id === null) {
          updateFields.push('r_delivery_company_id = NULL');
        } else {
          updateFields.push('r_delivery_company_id = ?');
          values.push(data.r_delivery_company_id);
        }
      }
      if (data.branch_id !== undefined) {
        if (data.branch_id === null) {
          updateFields.push('branch_id = NULL');
        } else {
          updateFields.push('branch_id = ?');
          values.push(data.branch_id);
        }
      }
      if (data.pick_up_date !== undefined) {
        if (data.pick_up_date === null) {
          updateFields.push('pick_up_date = NULL');
        } else {
          updateFields.push('pick_up_date = ?');
          values.push(data.pick_up_date);
        }
      }

      // Always update updated_at timestamp
      updateFields.push('updated_at = NOW()');

      if (updateFields.length === 0) {
        // No fields to update, just fetch and return the order
        const order = await this.findById(id);
        if (!order) {
          return {
            success: false,
            error: 'Order not found',
          };
        }
        return {
          success: true,
          order,
          message: 'Order updated successfully',
        };
      }

      // Add id to values for WHERE clause
      values.push(id);

      const updateQuery = `
        UPDATE orders 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;

      await prisma.$executeRawUnsafe(updateQuery, ...values);

      // Fetch the updated order
      const order = await this.findById(id);

      if (!order) {
        return {
          success: false,
          error: 'Failed to retrieve updated order',
        };
      }

      return {
        success: true,
        order,
        message: 'Order updated successfully',
      };
    } catch (error) {
      console.error('OrderModel.update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update order',
      };
    }
  }

  /**
   * Delete order
   */
  static async delete(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const deleteResult = await prisma.$executeRawUnsafe(
        `DELETE FROM orders WHERE id = ?`,
        id
      );

      // Check if any row was actually deleted
      if (deleteResult === 0) {
        return { success: false, error: 'Order not found or already deleted' };
      }

      return { success: true, message: 'Order deleted successfully' };
    } catch (error) {
      console.error('OrderModel.delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete order',
      };
    }
  }

  /**
   * Bulk delete orders
   */
  static async bulkDelete(ids: number[]): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (!ids || ids.length === 0) {
        return { success: false, error: 'No order IDs provided' };
      }

      const placeholders = ids.map(() => '?').join(',');
      await prisma.$executeRawUnsafe(
        `DELETE FROM orders WHERE id IN (${placeholders})`,
        ...ids
      );

      return { success: true, message: 'Orders deleted successfully' };
    } catch (error) {
      console.error('OrderModel.bulkDelete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete orders',
      };
    }
  }
}

