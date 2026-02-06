import { prisma } from '@/lib/db';

// GridElements interface matching Prisma schema
export interface GridElement {
  id: number;
  rGridId: number | null;
  positionX: string | null;
  positionY: string | null;
  width: string | null;
  height: string | null;
  actions: string | null;
  mainImage: string | null;
  lockedBy: number | null;
  createdBy: number;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CreateGridElementData {
  r_grid_id: number;
  position_x?: string | null;
  position_y?: string | null;
  width?: string | null;
  height?: string | null;
  actions?: string | null;
  main_image?: string | null;
}

export interface GridElementsListResponse {
  success: boolean;
  total: number;
  elements: GridElement[];
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface GridElementResponse {
  success: boolean;
  element?: GridElement;
  message?: string;
  error?: string;
}

export class GridElementsModel {
  /**
   * Fetch all elements for a specific grid with optional pagination
   */
  static async findByGridId(gridId: number, params?: {
    page?: number;
    limit?: number;
  }): Promise<GridElementsListResponse> {
    try {
      const page = params?.page || 1;
      const limit = params?.limit || 50;

      const countQuery = `SELECT COUNT(*) as count FROM grid_elements WHERE r_grid_id = ?`;
      const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        countQuery,
        gridId
      );
      const total = Number(countResult[0]?.count || 0);

      const offset = (page - 1) * limit;
      const query = `SELECT 
        id, r_grid_id, position_x, position_y, width, height,
        actions, main_image, locked_by, created_by, updated_by,
        CAST(created_at AS CHAR) as created_at,
        CAST(updated_at AS CHAR) as updated_at
      FROM grid_elements 
      WHERE r_grid_id = ?
      ORDER BY position_y ASC, position_x ASC 
      LIMIT ? OFFSET ?`;

      const rawElements = await prisma.$queryRawUnsafe<any[]>(query, gridId, limit, offset);

      const elements: GridElement[] = rawElements.map((row: any) => ({
        id: Number(row.id),
        rGridId: row.r_grid_id ? Number(row.r_grid_id) : null,
        positionX: row.position_x || null,
        positionY: row.position_y || null,
        width: row.width || null,
        height: row.height || null,
        actions: row.actions || null,
        mainImage: row.main_image || null,
        lockedBy: row.locked_by ? Number(row.locked_by) : null,
        createdBy: Number(row.created_by),
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
        elements,
      };
    } catch (error) {
      console.error('[GridElementsModel] findByGridId error:', error);
      throw error;
    }
  }

  /**
   * Fetch all elements with optional pagination and filters
   */
  static async findAll(params?: {
    page?: number;
    limit?: number;
    gridId?: number;
    sort?: string[];
  }): Promise<GridElementsListResponse> {
    try {
      const page = params?.page || 1;
      const limit = params?.limit || 50;

      const conditions: string[] = [];
      const values: any[] = [];

      if (params?.gridId) {
        conditions.push(`r_grid_id = ?`);
        values.push(params.gridId);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countQuery = `SELECT COUNT(*) as count FROM grid_elements ${whereClause}`;
      const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        countQuery,
        ...values
      );
      const total = Number(countResult[0]?.count || 0);

      const columnMap: Record<string, string> = {
        'id': 'id',
        'r_grid_id': 'r_grid_id',
        'position_x': 'position_x',
        'position_y': 'position_y',
        'created_at': 'created_at',
        'updated_at': 'updated_at',
      };

      let orderByClause = 'ORDER BY position_y ASC, position_x ASC';
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

      const offset = (page - 1) * limit;
      const query = `SELECT 
        id, r_grid_id, position_x, position_y, width, height,
        actions, main_image, locked_by, created_by, updated_by,
        CAST(created_at AS CHAR) as created_at,
        CAST(updated_at AS CHAR) as updated_at
      FROM grid_elements ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`;
      
      const queryValues = [...values, limit, offset];
      const rawElements = await prisma.$queryRawUnsafe<any[]>(query, ...queryValues);

      const elements: GridElement[] = rawElements.map((row: any) => ({
        id: Number(row.id),
        rGridId: row.r_grid_id ? Number(row.r_grid_id) : null,
        positionX: row.position_x || null,
        positionY: row.position_y || null,
        width: row.width || null,
        height: row.height || null,
        actions: row.actions || null,
        mainImage: row.main_image || null,
        lockedBy: row.locked_by ? Number(row.locked_by) : null,
        createdBy: Number(row.created_by),
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
        elements,
      };
    } catch (error) {
      console.error('[GridElementsModel] findAll error:', error);
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

  static async findById(id: number): Promise<GridElement | null> {
    try {
      const rawElements = await prisma.$queryRawUnsafe<any[]>(
        `SELECT 
          id, r_grid_id, position_x, position_y, width, height,
          actions, main_image, locked_by, created_by, updated_by,
          CAST(created_at AS CHAR) as created_at,
          CAST(updated_at AS CHAR) as updated_at
        FROM grid_elements WHERE id = ? LIMIT 1`,
        id
      );

      if (!rawElements || rawElements.length === 0) {
        return null;
      }

      const row = rawElements[0];
      return {
        id: Number(row.id),
        rGridId: row.r_grid_id ? Number(row.r_grid_id) : null,
        positionX: row.position_x || null,
        positionY: row.position_y || null,
        width: row.width || null,
        height: row.height || null,
        actions: row.actions || null,
        mainImage: row.main_image || null,
        lockedBy: row.locked_by ? Number(row.locked_by) : null,
        createdBy: Number(row.created_by),
        updatedBy: row.updated_by ? Number(row.updated_by) : null,
        createdAt: this.parseDate(row.created_at),
        updatedAt: this.parseDate(row.updated_at),
      };
    } catch (error) {
      console.error('GridElementsModel.findById error:', error);
      throw error;
    }
  }

  static async create(data: CreateGridElementData): Promise<GridElementResponse> {
    try {
      const insertQuery = `
        INSERT INTO grid_elements (
          r_grid_id, position_x, position_y, width, height,
          actions, main_image, created_by,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          NOW(), NOW()
        )
      `;

      const values = [
        data.r_grid_id,
        data.position_x ?? '0',
        data.position_y ?? '0',
        data.width ?? '100',
        data.height ?? '100',
        data.actions ?? null,
        data.main_image ?? null,
        1, // created_by - TODO: Get from auth context
      ];

      await prisma.$executeRawUnsafe(insertQuery, ...values);

      const idResult = await prisma.$queryRawUnsafe<Array<{ id: bigint }>>(
        `SELECT LAST_INSERT_ID() as id`
      );

      if (!idResult || idResult.length === 0 || !idResult[0].id) {
        return {
          success: false,
          error: 'Failed to retrieve created element ID',
        };
      }

      const elementId = Number(idResult[0].id);
      const element = await this.findById(elementId);

      if (!element) {
        return {
          success: false,
          error: 'Failed to retrieve created element',
        };
      }

      return {
        success: true,
        element: element!,
        message: 'Grid element created successfully',
      };
    } catch (error) {
      console.error('GridElementsModel.create error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create grid element',
      };
    }
  }

  static async update(id: number, data: Partial<CreateGridElementData>): Promise<GridElementResponse> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];

      if (data.r_grid_id !== undefined) {
        updateFields.push('r_grid_id = ?');
        values.push(data.r_grid_id);
      }
      if (data.position_x !== undefined) {
        updateFields.push('position_x = ?');
        values.push(data.position_x);
      }
      if (data.position_y !== undefined) {
        updateFields.push('position_y = ?');
        values.push(data.position_y);
      }
      if (data.width !== undefined) {
        updateFields.push('width = ?');
        values.push(data.width);
      }
      if (data.height !== undefined) {
        updateFields.push('height = ?');
        values.push(data.height);
      }
      if (data.actions !== undefined) {
        updateFields.push('actions = ?');
        values.push(data.actions);
      }
      if (data.main_image !== undefined) {
        updateFields.push('main_image = ?');
        values.push(data.main_image);
      }

      updateFields.push('updated_at = NOW()');

      if (updateFields.length === 1) { // Only updated_at
        const element = await this.findById(id);
        if (!element) {
          return {
            success: false,
            error: 'Grid element not found',
          };
        }
        return {
          success: true,
          element,
          message: 'Grid element updated successfully',
        };
      }

      values.push(id);
      const updateQuery = `UPDATE grid_elements SET ${updateFields.join(', ')} WHERE id = ?`;
      await prisma.$executeRawUnsafe(updateQuery, ...values);

      const element = await this.findById(id);
      if (!element) {
        return {
          success: false,
          error: 'Failed to retrieve updated element',
        };
      }

      return {
        success: true,
        element,
        message: 'Grid element updated successfully',
      };
    } catch (error) {
      console.error('GridElementsModel.update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update grid element',
      };
    }
  }

  static async delete(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const deleteResult = await prisma.$executeRawUnsafe(
        `DELETE FROM grid_elements WHERE id = ?`,
        id
      );

      if (deleteResult === 0) {
        return { success: false, error: 'Grid element not found or already deleted' };
      }

      return { success: true, message: 'Grid element deleted successfully' };
    } catch (error) {
      console.error('GridElementsModel.delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete grid element',
      };
    }
  }

  static async bulkDelete(ids: number[]): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (!ids || ids.length === 0) {
        return { success: false, error: 'No element IDs provided' };
      }

      const placeholders = ids.map(() => '?').join(',');
      await prisma.$executeRawUnsafe(
        `DELETE FROM grid_elements WHERE id IN (${placeholders})`,
        ...ids
      );

      return { success: true, message: 'Grid elements deleted successfully' };
    } catch (error) {
      console.error('GridElementsModel.bulkDelete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete grid elements',
      };
    }
  }

  /**
   * Update positions for multiple elements (for drag-and-drop reordering)
   */
  static async updatePositions(positions: Array<{ id: number; positionX: string; positionY: string }>): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      for (const pos of positions) {
        await prisma.$executeRawUnsafe(
          `UPDATE grid_elements SET position_x = ?, position_y = ?, updated_at = NOW() WHERE id = ?`,
          pos.positionX,
          pos.positionY,
          pos.id
        );
      }

      return { success: true, message: 'Positions updated successfully' };
    } catch (error) {
      console.error('GridElementsModel.updatePositions error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update positions',
      };
    }
  }
}
