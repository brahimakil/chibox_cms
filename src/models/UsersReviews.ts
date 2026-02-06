import { prisma } from '@/lib/db';

// UsersReviews interface matching Prisma schema
export interface UsersReviews {
  id: number;
  rUserId: number;
  rProductId: number;
  rating: number;
  text: string | null;
  status: number;
  statusText?: string | null; // Status text from ag_list_options
  userName?: string | null; // User name from users table
  productName?: string | null; // Product name from products table
  lockedBy: number | null;
  createdBy: number;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CreateUsersReviewsData {
  r_user_id: number;
  r_product_id: number;
  rating: number;
  text?: string | null;
  status: number;
}

export interface UsersReviewsListResponse {
  success: boolean;
  total: number;
  reviews: UsersReviews[];
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface UsersReviewsResponse {
  success: boolean;
  review?: UsersReviews;
  message?: string;
  error?: string;
}

export class UsersReviewsModel {
  /**
   * Fetch all product reviews with optional pagination and filters
   */
  static async findAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    id?: string;
    r_user_id?: string;
    r_product_id?: string;
    rating?: string;
    status?: string;
    sort?: string[];
  }): Promise<UsersReviewsListResponse> {
    try {
      const page = params?.page || 1;
      const limit = params?.limit || 50;

      const conditions: string[] = [];
      const values: any[] = [];

      if (params?.search) {
        conditions.push(`(LOWER(ur.text) LIKE LOWER(?) OR ur.id = ?)`);
        values.push(`%${params.search}%`, parseInt(params.search) || 0);
      }

      if (params?.id) {
        if (params.id.includes('-')) {
          const [min, max] = params.id.split('-').map(v => v.trim());
          if (min && max) {
            conditions.push(`ur.id >= ? AND ur.id <= ?`);
            values.push(parseInt(min), parseInt(max));
          } else if (min) {
            conditions.push(`ur.id >= ?`);
            values.push(parseInt(min));
          }
        } else {
          conditions.push(`ur.id = ?`);
          values.push(parseInt(params.id));
        }
      }

      if (params?.r_user_id) {
        conditions.push(`ur.r_user_id = ?`);
        values.push(parseInt(params.r_user_id));
      }

      if (params?.r_product_id) {
        conditions.push(`ur.r_product_id = ?`);
        values.push(parseInt(params.r_product_id));
      }

      if (params?.rating) {
        conditions.push(`ur.rating = ?`);
        values.push(parseInt(params.rating));
      }

      if (params?.status !== undefined && params.status !== '') {
        conditions.push(`ur.status = ?`);
        values.push(parseInt(params.status));
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countQuery = `SELECT COUNT(*) as count FROM users_reviews ur ${whereClause}`;
      const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        countQuery,
        ...values
      );
      const total = Number(countResult[0]?.count || 0);

      const columnMap: Record<string, string> = {
        'id': 'id',
        'r_user_id': 'r_user_id',
        'r_product_id': 'r_product_id',
        'rating': 'rating',
        'status': 'status',
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
          if (columnMap[column] || /^[a-z_]+$/.test(column)) {
            orderByParts.push(`${dbColumn} ${sortDirection}`);
          }
        });
        if (orderByParts.length > 0) {
          orderByClause = `ORDER BY ${orderByParts.join(', ')}`;
        }
      }
      
      if (!orderByClause) {
        orderByClause = 'ORDER BY id DESC';
      }

      const offset = (page - 1) * limit;
      const query = `SELECT 
        ur.id, ur.r_user_id, ur.r_product_id, ur.rating, ur.text, ur.status,
        ur.locked_by, ur.created_by, ur.updated_by,
        CAST(ur.created_at AS CHAR) as created_at,
        CAST(ur.updated_at AS CHAR) as updated_at,
        alo.name as status_text,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as user_name,
        p.product_name
      FROM users_reviews ur
      LEFT JOIN ag_list_options alo ON ur.status = alo.id AND alo.list_id = 6
      LEFT JOIN users u ON ur.r_user_id = u.id
      LEFT JOIN product p ON ur.r_product_id = p.id
      ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`;
      
      const queryValues = [...values, limit, offset];
      const rawReviews = await prisma.$queryRawUnsafe<any[]>(query, ...queryValues);

      const reviews: UsersReviews[] = rawReviews.map((row: any) => {
        // Clean up user name - remove extra spaces if first_name or last_name is null
        const userName = row.user_name ? row.user_name.trim() : null;
        return {
          id: Number(row.id),
          rUserId: Number(row.r_user_id || 0),
          rProductId: Number(row.r_product_id || 0),
          rating: Number(row.rating || 0),
          text: row.text || null,
          status: Number(row.status || 0),
          statusText: row.status_text || null,
          userName: userName && userName.length > 0 ? userName : null,
          productName: row.product_name || null,
          lockedBy: row.locked_by ? Number(row.locked_by) : null,
          createdBy: Number(row.created_by || 0),
          updatedBy: row.updated_by ? Number(row.updated_by) : null,
          createdAt: this.parseDate(row.created_at),
          updatedAt: this.parseDate(row.updated_at),
        };
      });

      return {
        success: true,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        reviews,
      };
    } catch (error) {
      console.error('[UsersReviewsModel] findAll error:', error);
      throw error;
    }
  }

  private static parseDate(dateValue: any): Date | null {
    if (!dateValue) return null;
    try {
      if (dateValue instanceof Date) {
        if (isNaN(dateValue.getTime())) return null;
        return dateValue;
      }
      if (typeof dateValue === 'string') {
        if (dateValue.startsWith('0000-00-00') || dateValue.includes('0000-00-00')) {
          return null;
        }
        const parsed = new Date(dateValue);
        if (isNaN(parsed.getTime())) return null;
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  static async findById(id: number): Promise<UsersReviews | null> {
    try {
      const rawReviews = await prisma.$queryRawUnsafe<any[]>(
        `SELECT 
          ur.id, ur.r_user_id, ur.r_product_id, ur.rating, ur.text, ur.status,
          ur.locked_by, ur.created_by, ur.updated_by,
          CAST(ur.created_at AS CHAR) as created_at,
          CAST(ur.updated_at AS CHAR) as updated_at,
          alo.name as status_text,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as user_name,
          p.product_name
        FROM users_reviews ur
        LEFT JOIN ag_list_options alo ON ur.status = alo.id AND alo.list_id = 6
        LEFT JOIN users u ON ur.r_user_id = u.id
        LEFT JOIN product p ON ur.r_product_id = p.id
        WHERE ur.id = ? LIMIT 1`,
        id
      );

      if (!rawReviews || rawReviews.length === 0) {
        return null;
      }

      const row = rawReviews[0];
      // Clean up user name - remove extra spaces if first_name or last_name is null
      const userName = row.user_name ? row.user_name.trim() : null;
      return {
        id: Number(row.id),
        rUserId: Number(row.r_user_id || 0),
        rProductId: Number(row.r_product_id || 0),
        rating: Number(row.rating || 0),
        text: row.text || null,
        status: Number(row.status || 0),
        statusText: row.status_text || null,
        userName: userName && userName.length > 0 ? userName : null,
        productName: row.product_name || null,
        lockedBy: row.locked_by ? Number(row.locked_by) : null,
        createdBy: Number(row.created_by || 0),
        updatedBy: row.updated_by ? Number(row.updated_by) : null,
        createdAt: this.parseDate(row.created_at),
        updatedAt: this.parseDate(row.updated_at),
      };
    } catch (error) {
      console.error('UsersReviewsModel.findById error:', error);
      throw error;
    }
  }

  static async create(data: CreateUsersReviewsData): Promise<UsersReviewsResponse> {
    try {
      const insertQuery = `
        INSERT INTO users_reviews (
          r_user_id, r_product_id, rating, text, status, created_by,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          NOW(), NOW()
        )
      `;

      const values = [
        data.r_user_id,
        data.r_product_id,
        data.rating,
        data.text ?? null,
        data.status,
        1, // created_by - TODO: Get from auth context
      ];

      await prisma.$executeRawUnsafe(insertQuery, ...values);

      const idResult = await prisma.$queryRawUnsafe<Array<{ id: bigint }>>(
        `SELECT LAST_INSERT_ID() as id`
      );

      if (!idResult || idResult.length === 0 || !idResult[0].id) {
        return {
          success: false,
          error: 'Failed to retrieve created review ID',
        };
      }

      const reviewId = Number(idResult[0].id);
      const review = await this.findById(reviewId);

      if (!review) {
        return {
          success: false,
          error: 'Failed to retrieve created review',
        };
      }

      return {
        success: true,
        review: review!,
        message: 'Product review created successfully',
      };
    } catch (error) {
      console.error('UsersReviewsModel.create error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create product review',
      };
    }
  }

  static async update(id: number, data: Partial<CreateUsersReviewsData>): Promise<UsersReviewsResponse> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];

      if (data.r_user_id !== undefined) {
        updateFields.push('r_user_id = ?');
        values.push(data.r_user_id);
      }
      if (data.r_product_id !== undefined) {
        updateFields.push('r_product_id = ?');
        values.push(data.r_product_id);
      }
      if (data.rating !== undefined) {
        updateFields.push('rating = ?');
        values.push(data.rating);
      }
      if (data.text !== undefined) {
        updateFields.push('text = ?');
        values.push(data.text ?? null);
      }
      if (data.status !== undefined) {
        updateFields.push('status = ?');
        values.push(data.status);
      }

      updateFields.push('updated_at = NOW()');

      if (updateFields.length === 0) {
        const review = await this.findById(id);
        if (!review) {
          return {
            success: false,
            error: 'Product review not found',
          };
        }
        return {
          success: true,
          review,
          message: 'Product review updated successfully',
        };
      }

      values.push(id);
      const updateQuery = `UPDATE users_reviews SET ${updateFields.join(', ')} WHERE id = ?`;
      await prisma.$executeRawUnsafe(updateQuery, ...values);

      const review = await this.findById(id);
      if (!review) {
        return {
          success: false,
          error: 'Failed to retrieve updated review',
        };
      }

      return {
        success: true,
        review,
        message: 'Product review updated successfully',
      };
    } catch (error) {
      console.error('UsersReviewsModel.update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update product review',
      };
    }
  }

  static async delete(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const deleteResult = await prisma.$executeRawUnsafe(
        `DELETE FROM users_reviews WHERE id = ?`,
        id
      );

      if (deleteResult === 0) {
        return { success: false, error: 'Product review not found or already deleted' };
      }

      return { success: true, message: 'Product review deleted successfully' };
    } catch (error) {
      console.error('UsersReviewsModel.delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete product review',
      };
    }
  }

  static async bulkDelete(ids: number[]): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (!ids || ids.length === 0) {
        return { success: false, error: 'No product review IDs provided' };
      }

      const placeholders = ids.map(() => '?').join(',');
      await prisma.$executeRawUnsafe(
        `DELETE FROM users_reviews WHERE id IN (${placeholders})`,
        ...ids
      );

      return { success: true, message: 'Product reviews deleted successfully' };
    } catch (error) {
      console.error('UsersReviewsModel.bulkDelete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete product reviews',
      };
    }
  }
}

