import { prisma } from '@/lib/db';

// FlashSales interface matching Prisma schema
export interface FlashSales {
  id: number;
  title: string;
  slug: string;
  color1: string;
  color2: string;
  color3: string;
  endTime: Date | null;
  display: number;
  sliderType: number;
  rStoreId: number;
  discount: number;
  orderNumber: number;
  lockedBy: number | null;
  createdBy: number;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CreateFlashSalesData {
  title: string;
  slug: string;
  color_1: string;
  color_2: string;
  color_3: string;
  end_time?: Date | null;
  display?: number;
  slider_type: number;
  r_store_id: number;
  discount: number;
  order_number: number;
}

export interface FlashSalesListResponse {
  success: boolean;
  total: number;
  flashSales: FlashSales[];
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface FlashSalesResponse {
  success: boolean;
  flashSale?: FlashSales;
  message?: string;
  error?: string;
}

export class FlashSalesModel {
  /**
   * Fetch all flash sales with optional pagination and filters
   */
  static async findAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    id?: string;
    title?: string;
    sort?: string[];
  }): Promise<FlashSalesListResponse> {
    try {
      const page = params?.page || 1;
      const limit = params?.limit || 50;

      const conditions: string[] = [];
      const values: any[] = [];

      if (params?.search) {
        conditions.push(`LOWER(title) LIKE LOWER(?)`);
        values.push(`%${params.search}%`);
      }

      if (params?.id) {
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

      if (params?.title) {
        conditions.push(`LOWER(title) LIKE LOWER(?)`);
        values.push(`%${params.title}%`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countQuery = `SELECT COUNT(*) as count FROM flash_sales ${whereClause}`;
      const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        countQuery,
        ...values
      );
      const total = Number(countResult[0]?.count || 0);

      const columnMap: Record<string, string> = {
        'id': 'id',
        'title': 'title',
        'order_number': 'order_number',
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
        id, title, slug, color_1, color_2, color_3,
        CAST(end_time AS CHAR) as end_time,
        display, slider_type, r_store_id, discount, order_number,
        locked_by, created_by, updated_by,
        CAST(created_at AS CHAR) as created_at,
        CAST(updated_at AS CHAR) as updated_at
      FROM flash_sales ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`;
      
      const queryValues = [...values, limit, offset];
      const rawFlashSales = await prisma.$queryRawUnsafe<any[]>(query, ...queryValues);

      const flashSales: FlashSales[] = rawFlashSales.map((row: any) => ({
        id: Number(row.id),
        title: row.title || '',
        slug: row.slug || '',
        color1: row.color_1 || '',
        color2: row.color_2 || '',
        color3: row.color_3 || '',
        endTime: this.parseDate(row.end_time),
        display: Number(row.display || 0),
        sliderType: Number(row.slider_type || 0),
        rStoreId: Number(row.r_store_id || 0),
        discount: Number(row.discount || 0),
        orderNumber: Number(row.order_number || 0),
        lockedBy: row.locked_by ? Number(row.locked_by) : null,
        createdBy: Number(row.created_by || 0),
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
        flashSales,
      };
    } catch (error) {
      console.error('[FlashSalesModel] findAll error:', error);
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

  static async findById(id: number): Promise<FlashSales | null> {
    try {
      const rawFlashSales = await prisma.$queryRawUnsafe<any[]>(
        `SELECT 
          id, title, slug, color_1, color_2, color_3,
          CAST(end_time AS CHAR) as end_time,
          display, slider_type, r_store_id, discount, order_number,
          locked_by, created_by, updated_by,
          CAST(created_at AS CHAR) as created_at,
          CAST(updated_at AS CHAR) as updated_at
        FROM flash_sales WHERE id = ? LIMIT 1`,
        id
      );

      if (!rawFlashSales || rawFlashSales.length === 0) {
        return null;
      }

      const row = rawFlashSales[0];
      return {
        id: Number(row.id),
        title: row.title || '',
        slug: row.slug || '',
        color1: row.color_1 || '',
        color2: row.color_2 || '',
        color3: row.color_3 || '',
        endTime: this.parseDate(row.end_time),
        display: Number(row.display || 0),
        sliderType: Number(row.slider_type || 0),
        rStoreId: Number(row.r_store_id || 0),
        discount: Number(row.discount || 0),
        orderNumber: Number(row.order_number || 0),
        lockedBy: row.locked_by ? Number(row.locked_by) : null,
        createdBy: Number(row.created_by || 0),
        updatedBy: row.updated_by ? Number(row.updated_by) : null,
        createdAt: this.parseDate(row.created_at),
        updatedAt: this.parseDate(row.updated_at),
      };
    } catch (error) {
      console.error('FlashSalesModel.findById error:', error);
      throw error;
    }
  }

  static async create(data: CreateFlashSalesData): Promise<FlashSalesResponse> {
    try {
      const insertQuery = `
        INSERT INTO flash_sales (
          title, slug, color_1, color_2, color_3, end_time,
          display, slider_type, r_store_id, discount, order_number, created_by,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          NOW(), NOW()
        )
      `;

      const values = [
        data.title,
        data.slug,
        data.color_1,
        data.color_2,
        data.color_3,
        data.end_time ? new Date(data.end_time).toISOString().slice(0, 19).replace('T', ' ') : null,
        data.display ?? 1,
        data.slider_type,
        data.r_store_id,
        data.discount,
        data.order_number,
        1, // created_by - TODO: Get from auth context
      ];

      await prisma.$executeRawUnsafe(insertQuery, ...values);

      const idResult = await prisma.$queryRawUnsafe<Array<{ id: bigint }>>(
        `SELECT LAST_INSERT_ID() as id`
      );

      if (!idResult || idResult.length === 0 || !idResult[0].id) {
        return {
          success: false,
          error: 'Failed to retrieve created flash sale ID',
        };
      }

      const flashSaleId = Number(idResult[0].id);
      const flashSale = await this.findById(flashSaleId);

      if (!flashSale) {
        return {
          success: false,
          error: 'Failed to retrieve created flash sale',
        };
      }

      return {
        success: true,
        flashSale: flashSale!,
        message: 'Flash sale created successfully',
      };
    } catch (error) {
      console.error('FlashSalesModel.create error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create flash sale',
      };
    }
  }

  static async update(id: number, data: Partial<CreateFlashSalesData>): Promise<FlashSalesResponse> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];

      if (data.title !== undefined) {
        updateFields.push('title = ?');
        values.push(data.title);
      }
      if (data.slug !== undefined) {
        updateFields.push('slug = ?');
        values.push(data.slug);
      }
      if (data.color_1 !== undefined) {
        updateFields.push('color_1 = ?');
        values.push(data.color_1);
      }
      if (data.color_2 !== undefined) {
        updateFields.push('color_2 = ?');
        values.push(data.color_2);
      }
      if (data.color_3 !== undefined) {
        updateFields.push('color_3 = ?');
        values.push(data.color_3);
      }
      if (data.end_time !== undefined) {
        updateFields.push('end_time = ?');
        values.push(data.end_time ? new Date(data.end_time).toISOString().slice(0, 19).replace('T', ' ') : null);
      }
      if (data.display !== undefined) {
        updateFields.push('display = ?');
        values.push(data.display);
      }
      if (data.slider_type !== undefined) {
        updateFields.push('slider_type = ?');
        values.push(data.slider_type);
      }
      if (data.r_store_id !== undefined) {
        updateFields.push('r_store_id = ?');
        values.push(data.r_store_id);
      }
      if (data.discount !== undefined) {
        updateFields.push('discount = ?');
        values.push(data.discount);
      }
      if (data.order_number !== undefined) {
        updateFields.push('order_number = ?');
        values.push(data.order_number);
      }

      updateFields.push('updated_at = NOW()');

      if (updateFields.length === 0) {
        const flashSale = await this.findById(id);
        if (!flashSale) {
          return {
            success: false,
            error: 'Flash sale not found',
          };
        }
        return {
          success: true,
          flashSale,
          message: 'Flash sale updated successfully',
        };
      }

      values.push(id);
      const updateQuery = `UPDATE flash_sales SET ${updateFields.join(', ')} WHERE id = ?`;
      await prisma.$executeRawUnsafe(updateQuery, ...values);

      const flashSale = await this.findById(id);
      if (!flashSale) {
        return {
          success: false,
          error: 'Failed to retrieve updated flash sale',
        };
      }

      return {
        success: true,
        flashSale,
        message: 'Flash sale updated successfully',
      };
    } catch (error) {
      console.error('FlashSalesModel.update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update flash sale',
      };
    }
  }

  static async delete(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const deleteResult = await prisma.$executeRawUnsafe(
        `DELETE FROM flash_sales WHERE id = ?`,
        id
      );

      if (deleteResult === 0) {
        return { success: false, error: 'Flash sale not found or already deleted' };
      }

      return { success: true, message: 'Flash sale deleted successfully' };
    } catch (error) {
      console.error('FlashSalesModel.delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete flash sale',
      };
    }
  }

  static async bulkDelete(ids: number[]): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (!ids || ids.length === 0) {
        return { success: false, error: 'No flash sale IDs provided' };
      }

      const placeholders = ids.map(() => '?').join(',');
      await prisma.$executeRawUnsafe(
        `DELETE FROM flash_sales WHERE id IN (${placeholders})`,
        ...ids
      );

      return { success: true, message: 'Flash sales deleted successfully' };
    } catch (error) {
      console.error('FlashSalesModel.bulkDelete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete flash sales',
      };
    }
  }
}

