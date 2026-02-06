import { prisma } from '@/lib/db';

// Brand interface matching Prisma schema
export interface Brand {
  id: number;
  brandName: string | null;
  slug: string;
  orderNumber: number;
  description: string | null;
  productCount: number;
  mainImage: string | null;
  attachmentCounter: number | null;
  lockedBy: number | null;
  createdBy: number;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  rStoreId: number | null;
  rGridId: number | null;
}

export interface CreateBrandData {
  brand_name?: string | null;
  slug: string;
  order_number: number;
  description?: string | null;
  product_count?: number;
  main_image?: string | null;
  r_store_id?: number | null;
  r_grid_id?: number | null;
}

export interface BrandListResponse {
  success: boolean;
  total: number;
  brands: Brand[];
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface BrandResponse {
  success: boolean;
  brand?: Brand;
  message?: string;
  error?: string;
}

export class BrandModel {
  /**
   * Fetch all brands with optional pagination and filters
   */
  static async findAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    id?: string;
    brand_name?: string;
    sort?: string[];
  }): Promise<BrandListResponse> {
    try {
      const page = params?.page || 1;
      const limit = params?.limit || 50;

      const conditions: string[] = [];
      const values: any[] = [];

      if (params?.search) {
        conditions.push(`LOWER(brand_name) LIKE LOWER(?)`);
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

      if (params?.brand_name) {
        conditions.push(`LOWER(brand_name) LIKE LOWER(?)`);
        values.push(`%${params.brand_name}%`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countQuery = `SELECT COUNT(*) as count FROM brand ${whereClause}`;
      const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        countQuery,
        ...values
      );
      const total = Number(countResult[0]?.count || 0);

      const columnMap: Record<string, string> = {
        'id': 'id',
        'brand_name': 'brand_name',
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
        id, brand_name, slug, order_number, description, product_count,
        main_image, attachment_counter, locked_by, created_by, updated_by,
        CAST(created_at AS CHAR) as created_at,
        CAST(updated_at AS CHAR) as updated_at,
        r_store_id, r_grid_id
      FROM brand ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`;
      
      const queryValues = [...values, limit, offset];
      const rawBrands = await prisma.$queryRawUnsafe<any[]>(query, ...queryValues);

      const brands: Brand[] = rawBrands.map((row: any) => ({
        id: Number(row.id),
        brandName: row.brand_name || null,
        slug: row.slug || '',
        orderNumber: Number(row.order_number || 0),
        description: row.description || null,
        productCount: Number(row.product_count || 0),
        mainImage: row.main_image || null,
        attachmentCounter: row.attachment_counter ? Number(row.attachment_counter) : null,
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
        brands,
      };
    } catch (error) {
      console.error('[BrandModel] findAll error:', error);
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

  static async findById(id: number): Promise<Brand | null> {
    try {
      const rawBrands = await prisma.$queryRawUnsafe<any[]>(
        `SELECT 
          id, brand_name, slug, order_number, description, product_count,
          main_image, attachment_counter, locked_by, created_by, updated_by,
          CAST(created_at AS CHAR) as created_at,
          CAST(updated_at AS CHAR) as updated_at,
          r_store_id, r_grid_id
        FROM brand WHERE id = ? LIMIT 1`,
        id
      );

      if (!rawBrands || rawBrands.length === 0) {
        return null;
      }

      const row = rawBrands[0];
      return {
        id: Number(row.id),
        brandName: row.brand_name || null,
        slug: row.slug || '',
        orderNumber: Number(row.order_number || 0),
        description: row.description || null,
        productCount: Number(row.product_count || 0),
        mainImage: row.main_image || null,
        attachmentCounter: row.attachment_counter ? Number(row.attachment_counter) : null,
        lockedBy: row.locked_by ? Number(row.locked_by) : null,
        createdBy: Number(row.created_by || 0),
        updatedBy: row.updated_by ? Number(row.updated_by) : null,
        createdAt: this.parseDate(row.created_at),
        updatedAt: this.parseDate(row.updated_at),
        rStoreId: row.r_store_id ? Number(row.r_store_id) : null,
        rGridId: row.r_grid_id ? Number(row.r_grid_id) : null,
      };
    } catch (error) {
      console.error('BrandModel.findById error:', error);
      throw error;
    }
  }

  static async create(data: CreateBrandData): Promise<BrandResponse> {
    try {
      const insertQuery = `
        INSERT INTO brand (
          brand_name, slug, order_number, description, product_count,
          main_image, r_store_id, r_grid_id, created_by,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          NOW(), NOW()
        )
      `;

      const values = [
        data.brand_name ?? null,
        data.slug,
        data.order_number,
        data.description ?? null,
        data.product_count ?? 0,
        data.main_image ?? null,
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
          error: 'Failed to retrieve created brand ID',
        };
      }

      const brandId = Number(idResult[0].id);
      const brand = await this.findById(brandId);

      if (!brand) {
        return {
          success: false,
          error: 'Failed to retrieve created brand',
        };
      }

      return {
        success: true,
        brand: brand!,
        message: 'Brand created successfully',
      };
    } catch (error) {
      console.error('BrandModel.create error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create brand',
      };
    }
  }

  static async update(id: number, data: Partial<CreateBrandData>): Promise<BrandResponse> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];

      if (data.brand_name !== undefined) {
        updateFields.push('brand_name = ?');
        values.push(data.brand_name ?? null);
      }
      if (data.slug !== undefined) {
        updateFields.push('slug = ?');
        values.push(data.slug);
      }
      if (data.order_number !== undefined) {
        updateFields.push('order_number = ?');
        values.push(data.order_number);
      }
      if (data.description !== undefined) {
        updateFields.push('description = ?');
        values.push(data.description ?? null);
      }
      if (data.product_count !== undefined) {
        updateFields.push('product_count = ?');
        values.push(data.product_count);
      }
      if (data.main_image !== undefined) {
        updateFields.push('main_image = ?');
        values.push(data.main_image ?? null);
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
        const brand = await this.findById(id);
        if (!brand) {
          return {
            success: false,
            error: 'Brand not found',
          };
        }
        return {
          success: true,
          brand,
          message: 'Brand updated successfully',
        };
      }

      values.push(id);
      const updateQuery = `UPDATE brand SET ${updateFields.join(', ')} WHERE id = ?`;
      await prisma.$executeRawUnsafe(updateQuery, ...values);

      const brand = await this.findById(id);
      if (!brand) {
        return {
          success: false,
          error: 'Failed to retrieve updated brand',
        };
      }

      return {
        success: true,
        brand,
        message: 'Brand updated successfully',
      };
    } catch (error) {
      console.error('BrandModel.update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update brand',
      };
    }
  }

  static async delete(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const deleteResult = await prisma.$executeRawUnsafe(
        `DELETE FROM brand WHERE id = ?`,
        id
      );

      if (deleteResult === 0) {
        return { success: false, error: 'Brand not found or already deleted' };
      }

      return { success: true, message: 'Brand deleted successfully' };
    } catch (error) {
      console.error('BrandModel.delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete brand',
      };
    }
  }

  static async bulkDelete(ids: number[]): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (!ids || ids.length === 0) {
        return { success: false, error: 'No brand IDs provided' };
      }

      const placeholders = ids.map(() => '?').join(',');
      await prisma.$executeRawUnsafe(
        `DELETE FROM brand WHERE id IN (${placeholders})`,
        ...ids
      );

      return { success: true, message: 'Brands deleted successfully' };
    } catch (error) {
      console.error('BrandModel.bulkDelete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete brands',
      };
    }
  }
}

