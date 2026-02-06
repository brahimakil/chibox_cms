import { NextRequest, NextResponse } from 'next/server';
import { OrderModel, CreateOrderData } from '@/models/Order';

export class OrderController {
  /**
   * Get all orders with optional pagination
   */
  static async index(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams;
      const rUserId = searchParams.get('r_user_id');
      const status = searchParams.get('status');
      const isPaid = searchParams.get('is_paid');
      const paymentType = searchParams.get('payment_type');
      const page = searchParams.get('page');
      const limit = searchParams.get('limit');
      const search = searchParams.get('search') || searchParams.get('q');
      // Column filters
      const id = searchParams.get('id');
      const total = searchParams.get('total');
      const quantity = searchParams.get('quantity');
      // Sorting parameters - can be multiple (e.g., sort=id:asc&sort=total:desc)
      const sortParams = searchParams.getAll('sort');

      const params: {
        r_user_id?: number;
        status?: number;
        is_paid?: number;
        payment_type?: number;
        page?: number;
        limit?: number;
        search?: string;
        id?: string;
        total?: string;
        quantity?: string;
        sort?: string[];
        enriched?: boolean;
      } = {};

      // Check for enriched parameter
      const enriched = searchParams.get('enriched');
      if (enriched === 'true') {
        params.enriched = true;
      }

      if (rUserId) {
        params.r_user_id = parseInt(rUserId);
      }
      // Enforce pagination - default to page 1, limit 50
      params.page = page ? parseInt(page) : 1;
      params.limit = limit ? parseInt(limit) : 50;
      
      // Allow up to 500 rows per page
      if (params.limit > 500) {
        params.limit = 500;
      }
      if (status !== null && status !== undefined) {
        params.status = parseInt(status);
      }
      if (isPaid !== null && isPaid !== undefined) {
        params.is_paid = parseInt(isPaid);
      }
      if (paymentType !== null && paymentType !== undefined) {
        params.payment_type = parseInt(paymentType);
      }
      if (search) {
        params.search = decodeURIComponent(search).trim();
      }
      // Column filters
      if (id) {
        params.id = id;
      }
      if (total) {
        params.total = total;
      }
      if (quantity) {
        params.quantity = quantity;
      }
      // Sorting parameters
      if (sortParams.length > 0) {
        params.sort = sortParams;
      }

      const result = await OrderModel.findAll(params);
      return NextResponse.json(result);
    } catch (error) {
      console.error('OrderController.index error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch orders',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Get single order by ID
   * Use enriched=true to get detailed order data matching PHP backend v3.0.0 structure
   */
  static async show(request: NextRequest, id: number) {
    try {
      const searchParams = request.nextUrl.searchParams;
      const enriched = searchParams.get('enriched') === 'true';
      
      if (enriched) {
        // Use new detailed method that returns data matching PHP backend v3.0.0
        const order = await OrderModel.findByIdDetailed(id);

        if (!order) {
          return NextResponse.json(
            { success: false, error: 'Order not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          order,
        });
      } else {
        // Use legacy method for backward compatibility
        const order = await OrderModel.findById(id);

        if (!order) {
          return NextResponse.json(
            { success: false, error: 'Order not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          order,
        });
      }
    } catch (error) {
      console.error('OrderController.show error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch order',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Create a new order
   */
  static async create(request: NextRequest) {
    try {
      const body = await request.json();

      // Validate required fields
      if (!body.r_user_id || !body.total || body.quantity === undefined || 
          !body.address_first_name || !body.address_last_name || 
          !body.address_country_code || !body.address_phone_number ||
          !body.address || !body.country || !body.city ||
          !body.route_name || !body.building_name || body.floor_number === undefined ||
          body.shipping_amount === undefined || body.payment_type === undefined) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      const orderData: CreateOrderData = {
        r_user_id: body.r_user_id,
        total: body.total,
        quantity: body.quantity,
        address_first_name: body.address_first_name,
        address_last_name: body.address_last_name,
        address_country_code: body.address_country_code,
        address_phone_number: body.address_phone_number,
        address: body.address,
        country: body.country,
        city: body.city,
        route_name: body.route_name,
        building_name: body.building_name,
        floor_number: body.floor_number,
        shipping_amount: body.shipping_amount,
        payment_type: body.payment_type,
        state: body.state ?? null,
        client_notes: body.client_notes ?? null,
        notes: body.notes ?? null,
        additional_details: body.additional_details ?? null,
        status: body.status ?? 0,
        payment_id: body.payment_id ?? null,
        coupon_code: body.coupon_code ?? null,
        r_delivery_company_id: body.r_delivery_company_id ?? null,
        branch_id: body.branch_id ?? null,
        pick_up_date: body.pick_up_date ? new Date(body.pick_up_date) : null,
      };

      const result = await OrderModel.create(orderData);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || result.message || 'Failed to create order',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      console.error('OrderController.create error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create order',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Update order
   */
  static async update(request: NextRequest, id: number) {
    try {
      const body = await request.json();

      const updateData: Partial<CreateOrderData> = {};

      if (body.r_user_id !== undefined) updateData.r_user_id = body.r_user_id;
      if (body.total !== undefined) updateData.total = body.total;
      if (body.quantity !== undefined) updateData.quantity = body.quantity;
      if (body.address_first_name !== undefined) updateData.address_first_name = body.address_first_name;
      if (body.address_last_name !== undefined) updateData.address_last_name = body.address_last_name;
      if (body.address_country_code !== undefined) updateData.address_country_code = body.address_country_code;
      if (body.address_phone_number !== undefined) updateData.address_phone_number = body.address_phone_number;
      if (body.address !== undefined) updateData.address = body.address;
      if (body.country !== undefined) updateData.country = body.country;
      if (body.city !== undefined) updateData.city = body.city;
      if (body.state !== undefined) updateData.state = body.state;
      if (body.route_name !== undefined) updateData.route_name = body.route_name;
      if (body.building_name !== undefined) updateData.building_name = body.building_name;
      if (body.floor_number !== undefined) updateData.floor_number = body.floor_number;
      if (body.status !== undefined) updateData.status = body.status;
      if (body.shipping_amount !== undefined) updateData.shipping_amount = body.shipping_amount;
      if (body.client_notes !== undefined) updateData.client_notes = body.client_notes;
      if (body.notes !== undefined) updateData.notes = body.notes;
      if (body.additional_details !== undefined) updateData.additional_details = body.additional_details;
      if (body.is_paid !== undefined) updateData.is_paid = body.is_paid;
      if (body.payment_type !== undefined) updateData.payment_type = body.payment_type;
      if (body.payment_id !== undefined) updateData.payment_id = body.payment_id;
      if (body.coupon_code !== undefined) updateData.coupon_code = body.coupon_code;
      if (body.r_delivery_company_id !== undefined) updateData.r_delivery_company_id = body.r_delivery_company_id;
      if (body.branch_id !== undefined) updateData.branch_id = body.branch_id;
      if (body.pick_up_date !== undefined) updateData.pick_up_date = body.pick_up_date ? new Date(body.pick_up_date) : null;

      const result = await OrderModel.update(id, updateData);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || result.message || 'Failed to update order',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('OrderController.update error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update order',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Delete order
   */
  static async delete(request: NextRequest, id: number) {
    try {
      const result = await OrderModel.delete(id);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to delete order',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('OrderController.delete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete order',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Bulk delete orders
   */
  static async bulkDelete(request: NextRequest) {
    try {
      const body = await request.json();
      const { ids } = body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No order IDs provided' },
          { status: 400 }
        );
      }

      const result = await OrderModel.bulkDelete(ids);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to delete orders',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('OrderController.bulkDelete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete orders',
        },
        { status: 500 }
      );
    }
  }
}

