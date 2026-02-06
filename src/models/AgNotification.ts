import { prisma } from '@/lib/db';

// AgNotification interface matching Prisma schema (ag_notification table)
export interface AgNotification {
  id: number;
  type: number | null;
  status: number;
  subject: string;
  description: string;
  targetId: number;
  lockedBy: number | null;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CreateAgNotificationData {
  type?: number | null;
  status: number;
  subject: string;
  description: string;
  target_id: number;
}

export interface AgNotificationListResponse {
  success: boolean;
  total: number;
  notifications: AgNotification[];
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface AgNotificationResponse {
  success: boolean;
  notification?: AgNotification;
  message?: string;
  error?: string;
}

// Status constants for AgNotification
export const AG_NOTIFICATION_STATUS = {
  UNREAD: 0,
  READ: 1,
} as const;

// Type constants for AgNotification (if applicable)
export const AG_NOTIFICATION_TYPE = {
  GENERAL: 0,
  ORDER: 1,
  PRODUCT: 2,
  USER: 3,
  SYSTEM: 4,
} as const;

export class AgNotificationModel {
  /**
   * Fetch all notifications with optional pagination and filters
   */
  static async findAll(params?: {
    status?: number;
    type?: number;
    page?: number;
    limit?: number;
    search?: string;
    // Column filters
    id?: string;
    subject?: string;
    sort?: string[];
    created_by?: number;
  }): Promise<AgNotificationListResponse> {
    try {
      // Enforce pagination - default to page 1, limit 50
      const page = params?.page || 1;
      const limit = params?.limit || 50;

      // Build WHERE conditions using MySQL placeholders (?)
      const conditions: string[] = [];
      const values: any[] = [];

      if (params?.status !== undefined) {
        conditions.push(`status = ?`);
        values.push(params.status);
      }

      if (params?.type !== undefined) {
        conditions.push(`type = ?`);
        values.push(params.type);
      }

      if (params?.created_by !== undefined) {
        conditions.push(`created_by = ?`);
        values.push(params.created_by);
      }

      if (params?.search) {
        // Search in subject and description
        conditions.push(`(
          LOWER(subject) LIKE LOWER(?) OR 
          LOWER(description) LIKE LOWER(?)
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
      const countQuery = `SELECT COUNT(*) as count FROM ag_notification ${whereClause}`;
      const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        countQuery,
        ...values
      );
      const total = Number(countResult[0]?.count || 0);

      // Build ORDER BY clause from sort parameters
      const columnMap: Record<string, string> = {
        'id': 'id',
        'subject': 'subject',
        'status': 'status',
        'type': 'type',
        'target_id': 'target_id',
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
        id, type, status, subject, description, target_id,
        locked_by, created_by, updated_by,
        CAST(created_at AS CHAR) as created_at,
        CAST(updated_at AS CHAR) as updated_at
      FROM ag_notification ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`;
      
      const queryValues = [...values, limit, offset];

      // Use raw query to handle invalid dates gracefully
      const rawNotifications = await prisma.$queryRawUnsafe<any[]>(query, ...queryValues);

      // Transform raw results to match AgNotification interface
      const notifications: AgNotification[] = rawNotifications.map((row: any) => ({
        id: Number(row.id),
        type: row.type !== null ? Number(row.type) : null,
        status: Number(row.status || 0),
        subject: row.subject || '',
        description: row.description || '',
        targetId: Number(row.target_id || 0),
        lockedBy: row.locked_by ? Number(row.locked_by) : null,
        createdBy: row.created_by ? Number(row.created_by) : null,
        updatedBy: row.updated_by ? Number(row.updated_by) : null,
        createdAt: this.parseDate(row.created_at),
        updatedAt: this.parseDate(row.updated_at),
      }));

      return {
        success: true,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        notifications,
      };
    } catch (error) {
      console.error('[AgNotificationModel] findAll error:', error);
      throw error;
    }
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
  static async findById(id: number): Promise<AgNotification | null> {
    try {
      const rawNotifications = await prisma.$queryRawUnsafe<any[]>(
        `SELECT 
          id, type, status, subject, description, target_id,
          locked_by, created_by, updated_by,
          CAST(created_at AS CHAR) as created_at,
          CAST(updated_at AS CHAR) as updated_at
        FROM ag_notification WHERE id = ? LIMIT 1`,
        id
      );

      if (!rawNotifications || rawNotifications.length === 0) {
        return null;
      }

      const row = rawNotifications[0];
      
      return {
        id: Number(row.id),
        type: row.type !== null ? Number(row.type) : null,
        status: Number(row.status || 0),
        subject: row.subject || '',
        description: row.description || '',
        targetId: Number(row.target_id || 0),
        lockedBy: row.locked_by ? Number(row.locked_by) : null,
        createdBy: row.created_by ? Number(row.created_by) : null,
        updatedBy: row.updated_by ? Number(row.updated_by) : null,
        createdAt: this.parseDate(row.created_at),
        updatedAt: this.parseDate(row.updated_at),
      };
    } catch (error) {
      console.error('AgNotificationModel.findById error:', error);
      throw error;
    }
  }

  /**
   * Get unread count for admin notifications
   */
  static async getUnreadCount(): Promise<number> {
    try {
      const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) as count FROM ag_notification WHERE status = ?`,
        AG_NOTIFICATION_STATUS.UNREAD
      );
      return Number(result[0]?.count || 0);
    } catch (error) {
      console.error('AgNotificationModel.getUnreadCount error:', error);
      return 0;
    }
  }

  /**
   * Create a new notification
   */
  static async create(data: CreateAgNotificationData, createdBy?: number): Promise<AgNotificationResponse> {
    try {
      // Use raw SQL to ensure proper column name mapping
      const insertQuery = `
        INSERT INTO ag_notification (
          type, status, subject, description, target_id, created_by,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          NOW(), NOW()
        )
      `;

      const values = [
        data.type ?? null,
        data.status,
        data.subject,
        data.description,
        data.target_id,
        createdBy ?? null,
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
      console.error('AgNotificationModel.create error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create notification',
      };
    }
  }

  /**
   * Update notification
   */
  static async update(id: number, data: Partial<CreateAgNotificationData>, updatedBy?: number): Promise<AgNotificationResponse> {
    try {
      // Build UPDATE query using raw SQL
      const updateFields: string[] = [];
      const values: any[] = [];

      if (data.type !== undefined) {
        if (data.type === null) {
          updateFields.push('type = NULL');
        } else {
          updateFields.push('type = ?');
          values.push(data.type);
        }
      }
      if (data.status !== undefined) {
        updateFields.push('status = ?');
        values.push(data.status);
      }
      if (data.subject !== undefined) {
        updateFields.push('subject = ?');
        values.push(data.subject);
      }
      if (data.description !== undefined) {
        updateFields.push('description = ?');
        values.push(data.description);
      }
      if (data.target_id !== undefined) {
        updateFields.push('target_id = ?');
        values.push(data.target_id);
      }

      // Always update updated_at timestamp and updated_by
      updateFields.push('updated_at = NOW()');
      if (updatedBy) {
        updateFields.push('updated_by = ?');
        values.push(updatedBy);
      }

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
        UPDATE ag_notification 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;

      await prisma.$executeRawUnsafe(updateQuery, ...values);

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
      console.error('AgNotificationModel.update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update notification',
      };
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(id: number, updatedBy?: number): Promise<AgNotificationResponse> {
    return this.update(id, { status: AG_NOTIFICATION_STATUS.READ }, updatedBy);
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(updatedBy?: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      let updateQuery = `UPDATE ag_notification SET status = ?, updated_at = NOW()`;
      const values: any[] = [AG_NOTIFICATION_STATUS.READ];

      if (updatedBy) {
        updateQuery += `, updated_by = ?`;
        values.push(updatedBy);
      }

      updateQuery += ` WHERE status = ?`;
      values.push(AG_NOTIFICATION_STATUS.UNREAD);

      await prisma.$executeRawUnsafe(updateQuery, ...values);

      return { success: true, message: 'All notifications marked as read' };
    } catch (error) {
      console.error('AgNotificationModel.markAllAsRead error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark all notifications as read',
      };
    }
  }

  /**
   * Delete notification
   */
  static async delete(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const deleteResult = await prisma.$executeRawUnsafe(
        `DELETE FROM ag_notification WHERE id = ?`,
        id
      );

      // Check if any row was actually deleted
      if (deleteResult === 0) {
        return { success: false, error: 'Notification not found or already deleted' };
      }

      return { success: true, message: 'Notification deleted successfully' };
    } catch (error) {
      console.error('AgNotificationModel.delete error:', error);
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

      const placeholders = ids.map(() => '?').join(',');
      await prisma.$executeRawUnsafe(
        `DELETE FROM ag_notification WHERE id IN (${placeholders})`,
        ...ids
      );

      return { success: true, message: 'Notifications deleted successfully' };
    } catch (error) {
      console.error('AgNotificationModel.bulkDelete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete notifications',
      };
    }
  }
}

