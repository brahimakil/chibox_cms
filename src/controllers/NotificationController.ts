import { NextRequest, NextResponse } from 'next/server';
import { NotificationModel, CreateNotificationData } from '@/models/Notification';
import { prisma } from '@/lib/db';

// Table mapping based on old backend (table_id values)
const TABLE_OPTIONS = [
  { id: 136, label: 'Brand', table: 'brand', field: 'brand_name' },
  { id: 137, label: 'Category', table: 'category', field: 'category_name' },
  { id: 154, label: 'Products', table: 'product', field: 'product_name' },
  { id: 155, label: 'Product Sections', table: 'product_sections', field: 'section_name' },
  { id: 159, label: 'Flash Sales', table: 'flash_sales', field: 'title' },
];

export class NotificationController {
  /**
   * Get all notifications with optional pagination
   */
  static async index(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams;
      const rUserId = searchParams.get('r_user_id');
      const isSeen = searchParams.get('is_seen');
      const page = searchParams.get('page');
      const limit = searchParams.get('limit');
      const search = searchParams.get('search') || searchParams.get('q');
      // Column filters
      const id = searchParams.get('id');
      const subject = searchParams.get('subject');
      // Sorting parameters - can be multiple (e.g., sort=id:asc&sort=subject:desc)
      const sortParams = searchParams.getAll('sort');

      const params: {
        r_user_id?: number | null;
        is_seen?: number;
        page?: number;
        limit?: number;
        search?: string;
        id?: string;
        subject?: string;
        sort?: string[];
        enriched?: boolean;
      } = {};

      // Check for enriched parameter
      const enriched = searchParams.get('enriched');
      if (enriched === 'true') {
        params.enriched = true;
      }

      if (rUserId !== null && rUserId !== undefined) {
        if (rUserId === 'null' || rUserId === '') {
          params.r_user_id = null;
        } else {
          params.r_user_id = parseInt(rUserId);
        }
      }
      // Enforce pagination - default to page 1, limit 50
      params.page = page ? parseInt(page) : 1;
      params.limit = limit ? parseInt(limit) : 50;
      
      // Allow up to 500 rows per page
      if (params.limit > 500) {
        params.limit = 500;
      }
      if (isSeen !== null && isSeen !== undefined) {
        params.is_seen = parseInt(isSeen);
      }
      if (search) {
        params.search = decodeURIComponent(search).trim();
      }
      // Column filters
      if (id) {
        params.id = id;
      }
      if (subject) {
        params.subject = subject;
      }
      // Sorting parameters
      if (sortParams.length > 0) {
        params.sort = sortParams;
      }

      const result = await NotificationModel.findAll(params);
      return NextResponse.json(result);
    } catch (error) {
      console.error('NotificationController.index error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch notifications',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Get single notification by ID with enriched data (names/labels)
   */
  static async show(request: NextRequest, id: number) {
    try {
      const notification = await NotificationModel.findById(id);

      if (!notification) {
        return NextResponse.json(
          { success: false, error: 'Notification not found' },
          { status: 404 }
        );
      }

      // Enrich notification with names/labels
      const enrichedNotification: any = { ...notification };
      
      // Fetch user name if rUserId exists
      if (notification.rUserId) {
        try {
          const userResult = await prisma.$queryRawUnsafe<any[]>(
            `SELECT id, first_name, last_name, email FROM users WHERE id = ? LIMIT 1`,
            notification.rUserId
          );
          if (userResult && userResult.length > 0) {
            const user = userResult[0];
            enrichedNotification.userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || `User ${user.id}`;
          }
        } catch (error) {
          console.error('Error fetching user name:', error);
        }
      }

      // Fetch target table name and target field name
      if (notification.tableId && notification.rowId) {
        const tableOption = TABLE_OPTIONS.find(t => t.id === notification.tableId);
        if (tableOption) {
          enrichedNotification.tableName = tableOption.label;
          
          // Fetch the name from the target table
          try {
            const fieldName = tableOption.field;
            const tableName = tableOption.table;
            
            // Handle product table which might use display_name or product_name
            let selectField = fieldName;
            if (tableName === 'product') {
              selectField = 'COALESCE(display_name, product_name) as name';
            } else {
              selectField = `${fieldName} as name`;
            }
            
            const targetResult = await prisma.$queryRawUnsafe<any[]>(
              `SELECT ${selectField} FROM ${tableName} WHERE id = ? LIMIT 1`,
              notification.rowId
            );
            
            if (targetResult && targetResult.length > 0) {
              enrichedNotification.targetFieldName = targetResult[0].name || targetResult[0][fieldName] || `Item ${notification.rowId}`;
            }
          } catch (error) {
            console.error('Error fetching target field name:', error);
          }
        }
      }

      return NextResponse.json({
        success: true,
        notification: enrichedNotification,
      });
    } catch (error) {
      console.error('NotificationController.show error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch notification',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Create a new notification
   */
  static async create(request: NextRequest) {
    try {
      const body = await request.json();

      // Validate required fields
      if (!body.subject || !body.body) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: subject, body' },
          { status: 400 }
        );
      }

      const notificationData: CreateNotificationData = {
        r_user_id: body.r_user_id !== undefined ? (body.r_user_id === null ? null : parseInt(body.r_user_id)) : null,
        subject: body.subject,
        body: body.body,
        table_id: body.table_id !== undefined ? (body.table_id === null ? null : parseInt(body.table_id)) : null,
        row_id: body.row_id !== undefined ? (body.row_id === null ? null : parseInt(body.row_id)) : null,
        is_seen: body.is_seen ?? 0,
      };

      const result = await NotificationModel.create(notificationData);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || result.message || 'Failed to create notification',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      console.error('NotificationController.create error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create notification',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Update notification
   */
  static async update(request: NextRequest, id: number) {
    try {
      const body = await request.json();

      const updateData: Partial<CreateNotificationData> = {};

      if (body.r_user_id !== undefined) {
        updateData.r_user_id = body.r_user_id === null ? null : parseInt(body.r_user_id);
      }
      if (body.is_seen !== undefined) {
        updateData.is_seen = parseInt(body.is_seen);
      }
      if (body.subject !== undefined) {
        updateData.subject = body.subject;
      }
      if (body.body !== undefined) {
        updateData.body = body.body;
      }
      if (body.table_id !== undefined) {
        updateData.table_id = body.table_id === null ? null : parseInt(body.table_id);
      }
      if (body.row_id !== undefined) {
        updateData.row_id = body.row_id === null ? null : parseInt(body.row_id);
      }

      const result = await NotificationModel.update(id, updateData);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || result.message || 'Failed to update notification',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('NotificationController.update error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update notification',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Delete notification
   */
  static async delete(request: NextRequest, id: number) {
    try {
      const result = await NotificationModel.delete(id);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to delete notification',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('NotificationController.delete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete notification',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Bulk delete notifications
   */
  static async bulkDelete(request: NextRequest) {
    try {
      const body = await request.json();
      const { ids } = body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No notification IDs provided' },
          { status: 400 }
        );
      }

      const result = await NotificationModel.bulkDelete(ids);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to delete notifications',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('NotificationController.bulkDelete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete notifications',
        },
        { status: 500 }
      );
    }
  }
}

