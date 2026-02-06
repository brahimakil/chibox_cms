import { prisma } from '@/lib/db';

// Grids interface matching Prisma schema
export interface Grids {
  id: number;
  rStoreId: number | null;
  rSectionId: number | null;
  isMain: number;
  type: string;
  categoryId: number | null;
  brandId: number | null;
  lockedBy: number | null;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CreateGridsData {
  r_store_id?: number | null;
  r_section_id?: number | null;
  is_main?: number;
  type: string;
  category_id?: number | null;
  brand_id?: number | null;
}

export interface GridsListResponse {
  success: boolean;
  total: number;
  grids: Grids[];
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface GridsResponse {
  success: boolean;
  grid?: Grids;
  message?: string;
  error?: string;
}

export class GridsModel {
  /**
   * Fetch all grids with optional pagination and filters
   */
  static async findAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    id?: string;
    type?: string;
    sort?: string[];
  }): Promise<GridsListResponse> {
    try {
      const page = params?.page || 1;
      const limit = params?.limit || 50;

      const conditions: string[] = [];
      const values: any[] = [];

      if (params?.search) {
        conditions.push(`LOWER(type) LIKE LOWER(?)`);
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

      if (params?.type) {
        conditions.push(`LOWER(type) LIKE LOWER(?)`);
        values.push(`%${params.type}%`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countQuery = `SELECT COUNT(*) as count FROM grids ${whereClause}`;
      const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        countQuery,
        ...values
      );
      const total = Number(countResult[0]?.count || 0);

      const columnMap: Record<string, string> = {
        'id': 'id',
        'type': 'type',
        'is_main': 'is_main',
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
        id, r_store_id, r_section_id, is_main, type,
        category_id, brand_id, locked_by, created_by, updated_by,
        CAST(created_at AS CHAR) as created_at,
        CAST(updated_at AS CHAR) as updated_at
      FROM grids ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`;
      
      const queryValues = [...values, limit, offset];
      const rawGrids = await prisma.$queryRawUnsafe<any[]>(query, ...queryValues);

      const grids: Grids[] = rawGrids.map((row: any) => ({
        id: Number(row.id),
        rStoreId: row.r_store_id ? Number(row.r_store_id) : null,
        rSectionId: row.r_section_id ? Number(row.r_section_id) : null,
        isMain: Number(row.is_main || 0),
        type: row.type || '',
        categoryId: row.category_id ? Number(row.category_id) : null,
        brandId: row.brand_id ? Number(row.brand_id) : null,
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
        grids,
      };
    } catch (error) {
      console.error('[GridsModel] findAll error:', error);
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

  static async findById(id: number): Promise<Grids | null> {
    try {
      const rawGrids = await prisma.$queryRawUnsafe<any[]>(
        `SELECT 
          id, r_store_id, r_section_id, is_main, type,
          category_id, brand_id, locked_by, created_by, updated_by,
          CAST(created_at AS CHAR) as created_at,
          CAST(updated_at AS CHAR) as updated_at
        FROM grids WHERE id = ? LIMIT 1`,
        id
      );

      if (!rawGrids || rawGrids.length === 0) {
        return null;
      }

      const row = rawGrids[0];
      return {
        id: Number(row.id),
        rStoreId: row.r_store_id ? Number(row.r_store_id) : null,
        rSectionId: row.r_section_id ? Number(row.r_section_id) : null,
        isMain: Number(row.is_main || 0),
        type: row.type || '',
        categoryId: row.category_id ? Number(row.category_id) : null,
        brandId: row.brand_id ? Number(row.brand_id) : null,
        lockedBy: row.locked_by ? Number(row.locked_by) : null,
        createdBy: row.created_by ? Number(row.created_by) : null,
        updatedBy: row.updated_by ? Number(row.updated_by) : null,
        createdAt: this.parseDate(row.created_at),
        updatedAt: this.parseDate(row.updated_at),
      };
    } catch (error) {
      console.error('GridsModel.findById error:', error);
      throw error;
    }
  }

  static async create(data: CreateGridsData): Promise<GridsResponse> {
    try {
      const insertQuery = `
        INSERT INTO grids (
          r_store_id, r_section_id, is_main, type,
          category_id, brand_id, created_by,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?,
          NOW(), NOW()
        )
      `;

      // Ensure type is trimmed and max 255 characters
      const typeValue = data.type ? data.type.trim().substring(0, 255) : '';

      const values = [
        data.r_store_id ?? null,
        data.r_section_id ?? null,
        data.is_main ?? 0,
        typeValue,
        data.category_id ?? null,
        data.brand_id ?? null,
        1, // created_by - TODO: Get from auth context
      ];

      await prisma.$executeRawUnsafe(insertQuery, ...values);

      const idResult = await prisma.$queryRawUnsafe<Array<{ id: bigint }>>(
        `SELECT LAST_INSERT_ID() as id`
      );

      if (!idResult || idResult.length === 0 || !idResult[0].id) {
        return {
          success: false,
          error: 'Failed to retrieve created grid ID',
        };
      }

      const gridId = Number(idResult[0].id);
      const grid = await this.findById(gridId);

      if (!grid) {
        return {
          success: false,
          error: 'Failed to retrieve created grid',
        };
      }

      return {
        success: true,
        grid: grid!,
        message: 'Grid created successfully',
      };
    } catch (error) {
      console.error('GridsModel.create error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create grid',
      };
    }
  }

  static async update(id: number, data: Partial<CreateGridsData>): Promise<GridsResponse> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];

      if (data.r_store_id !== undefined) {
        updateFields.push('r_store_id = ?');
        values.push(data.r_store_id ?? null);
      }
      if (data.r_section_id !== undefined) {
        updateFields.push('r_section_id = ?');
        values.push(data.r_section_id ?? null);
      }
      if (data.is_main !== undefined) {
        updateFields.push('is_main = ?');
        values.push(data.is_main);
      }
      if (data.type !== undefined) {
        updateFields.push('type = ?');
        // Ensure type is trimmed and max 255 characters
        const typeValue = data.type ? data.type.trim().substring(0, 255) : '';
        values.push(typeValue);
      }
      if (data.category_id !== undefined) {
        updateFields.push('category_id = ?');
        values.push(data.category_id ?? null);
      }
      if (data.brand_id !== undefined) {
        updateFields.push('brand_id = ?');
        values.push(data.brand_id ?? null);
      }

      updateFields.push('updated_at = NOW()');

      if (updateFields.length === 0) {
        const grid = await this.findById(id);
        if (!grid) {
          return {
            success: false,
            error: 'Grid not found',
          };
        }
        return {
          success: true,
          grid,
          message: 'Grid updated successfully',
        };
      }

      values.push(id);
      const updateQuery = `UPDATE grids SET ${updateFields.join(', ')} WHERE id = ?`;
      await prisma.$executeRawUnsafe(updateQuery, ...values);

      const grid = await this.findById(id);
      if (!grid) {
        return {
          success: false,
          error: 'Failed to retrieve updated grid',
        };
      }

      return {
        success: true,
        grid,
        message: 'Grid updated successfully',
      };
    } catch (error) {
      console.error('GridsModel.update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update grid',
      };
    }
  }

  static async delete(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const deleteResult = await prisma.$executeRawUnsafe(
        `DELETE FROM grids WHERE id = ?`,
        id
      );

      if (deleteResult === 0) {
        return { success: false, error: 'Grid not found or already deleted' };
      }

      return { success: true, message: 'Grid deleted successfully' };
    } catch (error) {
      console.error('GridsModel.delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete grid',
      };
    }
  }

  static async bulkDelete(ids: number[]): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (!ids || ids.length === 0) {
        return { success: false, error: 'No grid IDs provided' };
      }

      const placeholders = ids.map(() => '?').join(',');
      await prisma.$executeRawUnsafe(
        `DELETE FROM grids WHERE id IN (${placeholders})`,
        ...ids
      );

      return { success: true, message: 'Grids deleted successfully' };
    } catch (error) {
      console.error('GridsModel.bulkDelete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete grids',
      };
    }
  }
}

