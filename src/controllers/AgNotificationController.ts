import { NextRequest, NextResponse } from 'next/server';
import { AgNotificationModel, CreateAgNotificationData, AG_NOTIFICATION_STATUS } from '@/models/AgNotification';

export class AgNotificationController {
  /**
   * Get all notifications with optional pagination
   */
  static async index(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams;
      const status = searchParams.get('status');
      const type = searchParams.get('type');
      const page = searchParams.get('page');
      const limit = searchParams.get('limit');
      const search = searchParams.get('search') || searchParams.get('q');
      // Column filters
      const id = searchParams.get('id');
      const subject = searchParams.get('subject');
      // Sorting parameters - can be multiple (e.g., sort=id:asc&sort=subject:desc)
      const sortParams = searchParams.getAll('sort');

      const params: {
        status?: number;
        type?: number;
        page?: number;
        limit?: number;
        search?: string;
        id?: string;
        subject?: string;
        sort?: string[];
      } = {};

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
      if (type !== null && type !== undefined) {
        params.type = parseInt(type);
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

      const result = await AgNotificationModel.findAll(params);
      return NextResponse.json(result);
    } catch (error) {
      console.error('AgNotificationController.index error:', error);
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
   * Get unread notifications count
   */
  static async unreadCount() {
    try {
      const count = await AgNotificationModel.getUnreadCount();
      return NextResponse.json({
        success: true,
        count,
      });
    } catch (error) {
      console.error('AgNotificationController.unreadCount error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch unread count',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Get single notification by ID
   */
  static async show(request: NextRequest, id: number) {
    try {
      const notification = await AgNotificationModel.findById(id);

      if (!notification) {
        return NextResponse.json(
          { success: false, error: 'Notification not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        notification,
      });
    } catch (error) {
      console.error('AgNotificationController.show error:', error);
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
      if (!body.subject || !body.description) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: subject, description' },
          { status: 400 }
        );
      }

      const notificationData: CreateAgNotificationData = {
        type: body.type !== undefined ? (body.type === null ? null : parseInt(body.type)) : null,
        status: body.status !== undefined ? parseInt(body.status) : AG_NOTIFICATION_STATUS.UNREAD,
        subject: body.subject,
        description: body.description,
        target_id: body.target_id !== undefined ? parseInt(body.target_id) : 0,
      };

      // TODO: Get createdBy from auth context
      const createdBy = body.created_by ? parseInt(body.created_by) : undefined;

      const result = await AgNotificationModel.create(notificationData, createdBy);

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
      console.error('AgNotificationController.create error:', error);
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

      const updateData: Partial<CreateAgNotificationData> = {};

      if (body.type !== undefined) {
        updateData.type = body.type === null ? null : parseInt(body.type);
      }
      if (body.status !== undefined) {
        updateData.status = parseInt(body.status);
      }
      if (body.subject !== undefined) {
        updateData.subject = body.subject;
      }
      if (body.description !== undefined) {
        updateData.description = body.description;
      }
      if (body.target_id !== undefined) {
        updateData.target_id = parseInt(body.target_id);
      }

      // TODO: Get updatedBy from auth context
      const updatedBy = body.updated_by ? parseInt(body.updated_by) : undefined;

      const result = await AgNotificationModel.update(id, updateData, updatedBy);

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
      console.error('AgNotificationController.update error:', error);
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
   * Mark notification as read
   */
  static async markAsRead(request: NextRequest, id: number) {
    try {
      // TODO: Get updatedBy from auth context
      const result = await AgNotificationModel.markAsRead(id);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to mark notification as read',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('AgNotificationController.markAsRead error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to mark notification as read',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(request: NextRequest) {
    try {
      // TODO: Get updatedBy from auth context
      const result = await AgNotificationModel.markAllAsRead();

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to mark all notifications as read',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('AgNotificationController.markAllAsRead error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to mark all notifications as read',
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
      const result = await AgNotificationModel.delete(id);

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
      console.error('AgNotificationController.delete error:', error);
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

      const result = await AgNotificationModel.bulkDelete(ids);

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
      console.error('AgNotificationController.bulkDelete error:', error);
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

