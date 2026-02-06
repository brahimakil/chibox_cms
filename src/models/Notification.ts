import { prisma } from '@/lib/db';

// Notification interface matching Prisma schema
export interface Notification {
  id: number;
  rUserId: number | null;
  isSeen: number;
  subject: string;
  body: string;
  tableId: number | null;
  rowId: number | null;
  lockedBy: number | null;
  createdBy: number;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CreateNotificationData {
  r_user_id?: number | null;
  subject: string;
  body: string;
  table_id?: number | null;
  row_id?: number | null;
  is_seen?: number;
}

export interface NotificationListResponse {
  success: boolean;
  total: number;
  notifications: Notification[];
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface NotificationResponse {
  success: boolean;
  notification?: Notification;
  message?: string;
  error?: string;
}

export class NotificationModel {
  /**
   * Fetch all notifications with optional pagination and filters
   */
  static async findAll(params?: {
    r_user_id?: number;
    is_seen?: number;
    page?: number;
    limit?: number;
    search?: string;
    // Column filters
    id?: string;
    subject?: string;
    sort?: string[];
    enriched?: boolean; // If true, include names for users, tables, and target fields
  }): Promise<NotificationListResponse> {
    try {
      // Enforce pagination - default to page 1, limit 50
      const page = params?.page || 1;
      const limit = params?.limit || 50;

      // Build WHERE conditions using MySQL placeholders (?)
      const conditions: string[] = [];
      const values: any[] = [];

      if (params?.r_user_id !== undefined) {
        if (params.r_user_id === null) {
          conditions.push(`r_user_id IS NULL`);
        } else {
          conditions.push(`r_user_id = ?`);
          values.push(params.r_user_id);
        }
      }

      if (params?.is_seen !== undefined) {
        conditions.push(`is_seen = ?`);
        values.push(params.is_seen);
      }

      if (params?.search) {
        // Search in subject and body
        conditions.push(`(
          LOWER(subject) LIKE LOWER(?) OR 
          LOWER(body) LIKE LOWER(?)
        )`);
        const searchPattern = `%${params.search}%`;
        values.push(searchPattern, searchPattern);
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

      if (params?.subject) {
        // Filter by subject (LIKE search)
        conditions.push(`LOWER(subject) LIKE LOWER(?)`);
        const subjectPattern = `%${params.subject}%`;
        values.push(subjectPattern);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM notifications ${whereClause}`;
      const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        countQuery,
        ...values
      );
      const total = Number(countResult[0]?.count || 0);

      // Build ORDER BY clause from sort parameters
      const columnMap: Record<string, string> = {
        'id': 'id',
        'subject': 'subject',
        'is_seen': 'is_seen',
        'r_user_id': 'r_user_id',
        'table_id': 'table_id',
        'row_id': 'row_id',
        'created_at': 'created_at',
        'updated_at': 'updated_at',
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
        id, r_user_id, is_seen, subject, body, table_id, row_id,
        locked_by, created_by, updated_by,
        CAST(created_at AS CHAR) as created_at,
        CAST(updated_at AS CHAR) as updated_at
      FROM notifications ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`;
      
      const queryValues = [...values, limit, offset];

      // Use raw query to handle invalid dates gracefully
      const rawNotifications = await prisma.$queryRawUnsafe<any[]>(query, ...queryValues);

      // Transform raw results to match Notification interface
      let notifications: Notification[] = rawNotifications.map((row: any) => ({
        id: Number(row.id),
        rUserId: row.r_user_id ? Number(row.r_user_id) : null,
        isSeen: Number(row.is_seen || 0),
        subject: row.subject || '',
        body: row.body || '',
        tableId: row.table_id ? Number(row.table_id) : null,
        rowId: row.row_id ? Number(row.row_id) : null,
        lockedBy: row.locked_by ? Number(row.locked_by) : null,
        createdBy: Number(row.created_by || 0),
        updatedBy: row.updated_by ? Number(row.updated_by) : null,
        createdAt: this.parseDate(row.created_at),
        updatedAt: this.parseDate(row.updated_at),
      }));

      // Enrich notifications with names if requested
      if (params?.enriched) {
        notifications = await Promise.all(
          notifications.map(notif => this.enrichNotification(notif))
        );
      }

      return {
        success: true,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        notifications,
      };
    } catch (error) {
      console.error('[NotificationModel] findAll error:', error);
      throw error;
    }
  }

  /**
   * Enrich notification with names (user name, table name, target field name)
   */
  private static async enrichNotification(notification: Notification): Promise<Notification & {
    userName?: string | null;
    tableName?: string | null;
    targetFieldName?: string | null;
  }> {
    const enriched: any = { ...notification };

    // Table mapping
    const TABLE_OPTIONS = [
      { id: 136, label: 'Brand', table: 'brand', field: 'brand_name' },
      { id: 137, label: 'Category', table: 'category', field: 'category_name' },
      { id: 154, label: 'Products', table: 'product', field: 'product_name' },
      { id: 155, label: 'Product Sections', table: 'product_sections', field: 'section_name' },
      { id: 159, label: 'Flash Sales', table: 'flash_sales', field: 'title' },
    ];

    // Fetch user name if rUserId exists
    if (notification.rUserId) {
      try {
        const userResult = await prisma.$queryRawUnsafe<any[]>(
          `SELECT id, first_name, last_name, email FROM users WHERE id = ? LIMIT 1`,
          notification.rUserId
        );
        if (userResult && userResult.length > 0) {
          const user = userResult[0];
          enriched.userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || `User ${user.id}`;
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
      }
    }

    // Fetch target table name and target field name
    if (notification.tableId && notification.rowId) {
      const tableOption = TABLE_OPTIONS.find(t => t.id === notification.tableId);
      if (tableOption) {
        enriched.tableName = tableOption.label;

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
            enriched.targetFieldName = targetResult[0].name || targetResult[0][fieldName] || `Item ${notification.rowId}`;
          }
        } catch (error) {
          console.error('Error fetching target field name:', error);
        }
      }
    }

    return enriched;
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
   * Find notification by ID
   */
  static async findById(id: number): Promise<Notification | null> {
    try {
      const rawNotifications = await prisma.$queryRawUnsafe<any[]>(
        `SELECT 
          id, r_user_id, is_seen, subject, body, table_id, row_id,
          locked_by, created_by, updated_by,
          CAST(created_at AS CHAR) as created_at,
          CAST(updated_at AS CHAR) as updated_at
        FROM notifications WHERE id = ? LIMIT 1`,
        id
      );

      if (!rawNotifications || rawNotifications.length === 0) {
        return null;
      }

      const row = rawNotifications[0];
      
      return {
        id: Number(row.id),
        rUserId: row.r_user_id ? Number(row.r_user_id) : null,
        isSeen: Number(row.is_seen || 0),
        subject: row.subject || '',
        body: row.body || '',
        tableId: row.table_id ? Number(row.table_id) : null,
        rowId: row.row_id ? Number(row.row_id) : null,
        lockedBy: row.locked_by ? Number(row.locked_by) : null,
        createdBy: Number(row.created_by || 0),
        updatedBy: row.updated_by ? Number(row.updated_by) : null,
        createdAt: this.parseDate(row.created_at),
        updatedAt: this.parseDate(row.updated_at),
      };
    } catch (error) {
      console.error('NotificationModel.findById error:', error);
      throw error;
    }
  }

  /**
   * Create a new notification
   */
  static async create(data: CreateNotificationData): Promise<NotificationResponse> {
    try {
      // Use raw SQL to ensure proper column name mapping
      const insertQuery = `
        INSERT INTO notifications (
          r_user_id, is_seen, subject, body, table_id, row_id, created_by,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          NOW(), NOW()
        )
      `;

      const values = [
        data.r_user_id ?? null,
        data.is_seen ?? 0,
        data.subject,
        data.body,
        data.table_id ?? null,
        data.row_id ?? null,
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
          error: 'Failed to retrieve created notification ID',
        };
      }

      const notificationId = Number(idResult[0].id);
      
      // If r_user_id is null, create entries in users_notifications for all active users
      // If r_user_id is set, don't create users_notifications entry (notification is for specific user via r_user_id)
      if (!data.r_user_id) {
        try {
          const activeUsers = await prisma.$queryRawUnsafe<any[]>(
            `SELECT id FROM users WHERE is_active = 1`
          );

          if (activeUsers && activeUsers.length > 0) {
            const placeholders = activeUsers.map(() => '(?, ?, ?)').join(',');
            const userNotificationValues: any[] = [];
            
            activeUsers.forEach((user: any) => {
              userNotificationValues.push(Number(user.id), notificationId, 0); // is_seen = 0
            });

            await prisma.$executeRawUnsafe(
              `INSERT INTO users_notifications (r_user_id, notification_id, is_seen) VALUES ${placeholders}`,
              ...userNotificationValues
            );
          }
        } catch (userNotificationError) {
          console.error('Error creating user notifications:', userNotificationError);
          // Continue even if user notifications creation fails
        }
      }
      // Note: When r_user_id is set, we don't create users_notifications entry
      // The notification is linked directly via r_user_id in the notifications table

      const notification = await this.findById(notificationId);

      if (!notification) {
        return {
          success: false,
          error: 'Failed to retrieve created notification',
        };
      }

      return {
        success: true,
        notification: notification!,
        message: 'Notification created successfully',
      };
    } catch (error) {
      console.error('NotificationModel.create error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create notification',
      };
    }
  }

  /**
   * Update notification
   */
  static async update(id: number, data: Partial<CreateNotificationData>): Promise<NotificationResponse> {
    try {
      // Build UPDATE query using raw SQL
      const updateFields: string[] = [];
      const values: any[] = [];

      if (data.r_user_id !== undefined) {
        if (data.r_user_id === null) {
          updateFields.push('r_user_id = NULL');
        } else {
          updateFields.push('r_user_id = ?');
          values.push(data.r_user_id);
        }
      }
      if (data.is_seen !== undefined) {
        updateFields.push('is_seen = ?');
        values.push(data.is_seen);
      }
      if (data.subject !== undefined) {
        updateFields.push('subject = ?');
        values.push(data.subject);
      }
      if (data.body !== undefined) {
        updateFields.push('body = ?');
        values.push(data.body);
      }
      if (data.table_id !== undefined) {
        if (data.table_id === null) {
          updateFields.push('table_id = NULL');
        } else {
          updateFields.push('table_id = ?');
          values.push(data.table_id);
        }
      }
      if (data.row_id !== undefined) {
        if (data.row_id === null) {
          updateFields.push('row_id = NULL');
        } else {
          updateFields.push('row_id = ?');
          values.push(data.row_id);
        }
      }

      // Always update updated_at timestamp
      updateFields.push('updated_at = NOW()');

      if (updateFields.length === 0) {
        // No fields to update, just fetch and return the notification
        const notification = await this.findById(id);
        if (!notification) {
          return {
            success: false,
            error: 'Notification not found',
          };
        }
        return {
          success: true,
          notification,
          message: 'Notification updated successfully',
        };
      }

      // Add id to values for WHERE clause
      values.push(id);

      const updateQuery = `
        UPDATE notifications 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;

      await prisma.$executeRawUnsafe(updateQuery, ...values);

      // Handle users_notifications updates if r_user_id changed
      if (data.r_user_id !== undefined) {
        // Always delete existing user notifications first
        await prisma.$executeRawUnsafe(
          `DELETE FROM users_notifications WHERE notification_id = ?`,
          id
        );

        // Only create new user notifications if r_user_id is null (for all users)
        // If r_user_id is set, don't create users_notifications entry (notification linked via r_user_id)
        if (data.r_user_id === null) {
          // Create for all active users
          const activeUsers = await prisma.$queryRawUnsafe<any[]>(
            `SELECT id FROM users WHERE is_active = 1`
          );

          if (activeUsers && activeUsers.length > 0) {
            const placeholders = activeUsers.map(() => '(?, ?, ?)').join(',');
            const userNotificationValues: any[] = [];
            
            activeUsers.forEach((user: any) => {
              userNotificationValues.push(Number(user.id), id, 0); // is_seen = 0
            });

            await prisma.$executeRawUnsafe(
              `INSERT INTO users_notifications (r_user_id, notification_id, is_seen) VALUES ${placeholders}`,
              ...userNotificationValues
            );
          }
        }
        // Note: When r_user_id is set, we don't create users_notifications entry
        // The notification is linked directly via r_user_id in the notifications table
      }

      // Fetch the updated notification
      const notification = await this.findById(id);

      if (!notification) {
        return {
          success: false,
          error: 'Failed to retrieve updated notification',
        };
      }

      return {
        success: true,
        notification,
        message: 'Notification updated successfully',
      };
    } catch (error) {
      console.error('NotificationModel.update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update notification',
      };
    }
  }

  /**
   * Delete notification
   */
  static async delete(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Delete related user notifications first
      await prisma.$executeRawUnsafe(
        `DELETE FROM users_notifications WHERE notification_id = ?`,
        id
      );

      // Delete the notification
      const deleteResult = await prisma.$executeRawUnsafe(
        `DELETE FROM notifications WHERE id = ?`,
        id
      );

      // Check if any row was actually deleted
      if (deleteResult === 0) {
        return { success: false, error: 'Notification not found or already deleted' };
      }

      return { success: true, message: 'Notification deleted successfully' };
    } catch (error) {
      console.error('NotificationModel.delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete notification',
      };
    }
  }

  /**
   * Bulk delete notifications
   */
  static async bulkDelete(ids: number[]): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (!ids || ids.length === 0) {
        return { success: false, error: 'No notification IDs provided' };
      }

      // Delete related user notifications first
      const placeholders = ids.map(() => '?').join(',');
      await prisma.$executeRawUnsafe(
        `DELETE FROM users_notifications WHERE notification_id IN (${placeholders})`,
        ...ids
      );

      // Delete the notifications
      await prisma.$executeRawUnsafe(
        `DELETE FROM notifications WHERE id IN (${placeholders})`,
        ...ids
      );

      return { success: true, message: 'Notifications deleted successfully' };
    } catch (error) {
      console.error('NotificationModel.bulkDelete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete notifications',
      };
    }
  }
}

