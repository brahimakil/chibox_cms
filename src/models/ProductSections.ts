import { prisma } from '@/lib/db';

// ProductSections interface matching Prisma schema
export interface ProductSections {
  id: number;
  sectionName: string;
  slug: string;
  orderNumber: number;
  showHide: number;
  sliderType: number;
  lockedBy: number | null;
  createdBy: number;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  rStoreId: number | null;
  rGridId: number | null;
}

export interface CreateProductSectionsData {
  section_name: string;
  slug: string;
  order_number: number;
  show_hide: number;
  slider_type: number;
  r_store_id?: number | null;
  r_grid_id?: number | null;
}

export interface ProductSectionsListResponse {
  success: boolean;
  total: number;
  sections: ProductSections[];
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface ProductSectionsResponse {
  success: boolean;
  section?: ProductSections;
  message?: string;
  error?: string;
}

export class ProductSectionsModel {
  /**
   * Fetch all product sections with optional pagination and filters
   */
  static async findAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    id?: string;
    section_name?: string;
    sort?: string[];
  }): Promise<ProductSectionsListResponse> {
    try {
      const page = params?.page || 1;
      const limit = params?.limit || 50;

      const conditions: string[] = [];
      const values: any[] = [];

      if (params?.search) {
        conditions.push(`LOWER(section_name) LIKE LOWER(?)`);
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

      if (params?.section_name) {
        conditions.push(`LOWER(section_name) LIKE LOWER(?)`);
        values.push(`%${params.section_name}%`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countQuery = `SELECT COUNT(*) as count FROM product_sections ${whereClause}`;
      const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        countQuery,
        ...values
      );
      const total = Number(countResult[0]?.count || 0);

      const columnMap: Record<string, string> = {
        'id': 'id',
        'section_name': 'section_name',
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
        id, section_name, slug, order_number, show_hide, slider_type,
        locked_by, created_by, updated_by,
        CAST(created_at AS CHAR) as created_at,
        CAST(updated_at AS CHAR) as updated_at,
        r_store_id, r_grid_id
      FROM product_sections ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`;
      
      const queryValues = [...values, limit, offset];
      const rawSections = await prisma.$queryRawUnsafe<any[]>(query, ...queryValues);

      const sections: ProductSections[] = rawSections.map((row: any) => ({
        id: Number(row.id),
        sectionName: row.section_name || '',
        slug: row.slug || '',
        orderNumber: Number(row.order_number || 0),
        showHide: Number(row.show_hide || 0),
        sliderType: Number(row.slider_type || 0),
        lockedBy: row.locked_by ? Number(row.locked_by) : null,
        createdBy: Number(row.created_by || 0),
        updatedBy: row.updated_by ? Number(row.updated_by) : null,
        createdAt: this.parseDate(row.created_at),
        updatedAt: this.parseDate(row.updated_at),
        rStoreId: row.r_store_id ? Number(row.r_store_id) : null,
        rGridId: row.r_grid_id ? Number(row.r_grid_id) : null,
      }));

      return {
        success: true,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        sections,
      };
    } catch (error) {
      console.error('[ProductSectionsModel] findAll error:', error);
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

  static async findById(id: number): Promise<ProductSections | null> {
    try {
      const rawSections = await prisma.$queryRawUnsafe<any[]>(
        `SELECT 
          id, section_name, slug, order_number, show_hide, slider_type,
          locked_by, created_by, updated_by,
          CAST(created_at AS CHAR) as created_at,
          CAST(updated_at AS CHAR) as updated_at,
          r_store_id, r_grid_id
        FROM product_sections WHERE id = ? LIMIT 1`,
        id
      );

      if (!rawSections || rawSections.length === 0) {
        return null;
      }

      const row = rawSections[0];
      return {
        id: Number(row.id),
        sectionName: row.section_name || '',
        slug: row.slug || '',
        orderNumber: Number(row.order_number || 0),
        showHide: Number(row.show_hide || 0),
        sliderType: Number(row.slider_type || 0),
        lockedBy: row.locked_by ? Number(row.locked_by) : null,
        createdBy: Number(row.created_by || 0),
        updatedBy: row.updated_by ? Number(row.updated_by) : null,
        createdAt: this.parseDate(row.created_at),
        updatedAt: this.parseDate(row.updated_at),
        rStoreId: row.r_store_id ? Number(row.r_store_id) : null,
        rGridId: row.r_grid_id ? Number(row.r_grid_id) : null,
      };
    } catch (error) {
      console.error('ProductSectionsModel.findById error:', error);
      throw error;
    }
  }

  static async create(data: CreateProductSectionsData): Promise<ProductSectionsResponse> {
    try {
      const insertQuery = `
        INSERT INTO product_sections (
          section_name, slug, order_number, show_hide, slider_type,
          r_store_id, r_grid_id, created_by,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          NOW(), NOW()
        )
      `;

      const values = [
        data.section_name,
        data.slug,
        data.order_number,
        data.show_hide,
        data.slider_type,
        data.r_store_id ?? null,
        data.r_grid_id ?? null,
        1, // created_by - TODO: Get from auth context
      ];

      await prisma.$executeRawUnsafe(insertQuery, ...values);

      const idResult = await prisma.$queryRawUnsafe<Array<{ id: bigint }>>(
        `SELECT LAST_INSERT_ID() as id`
      );

      if (!idResult || idResult.length === 0 || !idResult[0].id) {
        return {
          success: false,
          error: 'Failed to retrieve created product section ID',
        };
      }

      const sectionId = Number(idResult[0].id);
      const section = await this.findById(sectionId);

      if (!section) {
        return {
          success: false,
          error: 'Failed to retrieve created product section',
        };
      }

      return {
        success: true,
        section: section!,
        message: 'Product section created successfully',
      };
    } catch (error) {
      console.error('ProductSectionsModel.create error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create product section',
      };
    }
  }

  static async update(id: number, data: Partial<CreateProductSectionsData>): Promise<ProductSectionsResponse> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];

      if (data.section_name !== undefined) {
        updateFields.push('section_name = ?');
        values.push(data.section_name);
      }
      if (data.slug !== undefined) {
        updateFields.push('slug = ?');
        values.push(data.slug);
      }
      if (data.order_number !== undefined) {
        updateFields.push('order_number = ?');
        values.push(data.order_number);
      }
      if (data.show_hide !== undefined) {
        updateFields.push('show_hide = ?');
        values.push(data.show_hide);
      }
      if (data.slider_type !== undefined) {
        updateFields.push('slider_type = ?');
        values.push(data.slider_type);
      }
      if (data.r_store_id !== undefined) {
        updateFields.push('r_store_id = ?');
        values.push(data.r_store_id ?? null);
      }
      if (data.r_grid_id !== undefined) {
        updateFields.push('r_grid_id = ?');
        values.push(data.r_grid_id ?? null);
      }

      updateFields.push('updated_at = NOW()');

      if (updateFields.length === 0) {
        const section = await this.findById(id);
        if (!section) {
          return {
            success: false,
            error: 'Product section not found',
          };
        }
        return {
          success: true,
          section,
          message: 'Product section updated successfully',
        };
      }

      values.push(id);
      const updateQuery = `UPDATE product_sections SET ${updateFields.join(', ')} WHERE id = ?`;
      await prisma.$executeRawUnsafe(updateQuery, ...values);

      const section = await this.findById(id);
      if (!section) {
        return {
          success: false,
          error: 'Failed to retrieve updated product section',
        };
      }

      return {
        success: true,
        section,
        message: 'Product section updated successfully',
      };
    } catch (error) {
      console.error('ProductSectionsModel.update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update product section',
      };
    }
  }

  static async delete(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const deleteResult = await prisma.$executeRawUnsafe(
        `DELETE FROM product_sections WHERE id = ?`,
        id
      );

      if (deleteResult === 0) {
        return { success: false, error: 'Product section not found or already deleted' };
      }

      return { success: true, message: 'Product section deleted successfully' };
    } catch (error) {
      console.error('ProductSectionsModel.delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete product section',
      };
    }
  }

  static async bulkDelete(ids: number[]): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (!ids || ids.length === 0) {
        return { success: false, error: 'No product section IDs provided' };
      }

      const placeholders = ids.map(() => '?').join(',');
      await prisma.$executeRawUnsafe(
        `DELETE FROM product_sections WHERE id IN (${placeholders})`,
        ...ids
      );

      return { success: true, message: 'Product sections deleted successfully' };
    } catch (error) {
      console.error('ProductSectionsModel.bulkDelete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete product sections',
      };
    }
  }
}

