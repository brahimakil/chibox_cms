import { NextRequest, NextResponse } from 'next/server';
import { GridsModel, CreateGridsData } from '@/models/Grids';

export class GridsController {
  /**
   * Get all grids with optional pagination
   */
  static async index(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams;
      const page = searchParams.get('page');
      const limit = searchParams.get('limit');
      const search = searchParams.get('search') || searchParams.get('q');
      const id = searchParams.get('id');
      const type = searchParams.get('type');
      const sortParams = searchParams.getAll('sort');

      const params: {
        page?: number;
        limit?: number;
        search?: string;
        id?: string;
        type?: string;
        sort?: string[];
      } = {};

      params.page = page ? parseInt(page) : 1;
      params.limit = limit ? parseInt(limit) : 50;
      
      if (params.limit > 500) {
        params.limit = 500;
      }
      if (search) {
        params.search = decodeURIComponent(search).trim();
      }
      if (id) {
        params.id = id;
      }
      if (type) {
        params.type = type;
      }
      if (sortParams.length > 0) {
        params.sort = sortParams;
      }

      const result = await GridsModel.findAll(params);
      return NextResponse.json(result);
    } catch (error) {
      console.error('GridsController.index error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch grids',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Get single grid by ID
   */
  static async show(request: NextRequest, id: number) {
    try {
      const grid = await GridsModel.findById(id);

      if (!grid) {
        return NextResponse.json(
          { success: false, error: 'Grid not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        grid,
      });
    } catch (error) {
      console.error('GridsController.show error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch grid',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Create a new grid
   */
  static async create(request: NextRequest) {
    try {
      const body = await request.json();

      if (!body.type) {
        return NextResponse.json(
          { success: false, error: 'Missing required field: type' },
          { status: 400 }
        );
      }

      const gridData: CreateGridsData = {
        r_store_id: body.r_store_id ?? null,
        r_section_id: body.r_section_id ?? null,
        is_main: body.is_main ?? 0,
        type: body.type,
        category_id: body.category_id ?? null,
        brand_id: body.brand_id ?? null,
      };

      const result = await GridsModel.create(gridData);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || result.message || 'Failed to create grid',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      console.error('GridsController.create error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create grid',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Update grid
   */
  static async update(request: NextRequest, id: number) {
    try {
      const body = await request.json();

      const updateData: Partial<CreateGridsData> = {};

      if (body.r_store_id !== undefined) updateData.r_store_id = body.r_store_id;
      if (body.r_section_id !== undefined) updateData.r_section_id = body.r_section_id;
      if (body.is_main !== undefined) updateData.is_main = body.is_main;
      if (body.type !== undefined) updateData.type = body.type;
      if (body.category_id !== undefined) updateData.category_id = body.category_id;
      if (body.brand_id !== undefined) updateData.brand_id = body.brand_id;

      const result = await GridsModel.update(id, updateData);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || result.message || 'Failed to update grid',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('GridsController.update error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update grid',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Delete grid
   */
  static async delete(request: NextRequest, id: number) {
    try {
      const result = await GridsModel.delete(id);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to delete grid',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('GridsController.delete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete grid',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Bulk delete grids
   */
  static async bulkDelete(request: NextRequest) {
    try {
      const body = await request.json();
      const { ids } = body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No grid IDs provided' },
          { status: 400 }
        );
      }

      const result = await GridsModel.bulkDelete(ids);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to delete grids',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('GridsController.bulkDelete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete grids',
        },
        { status: 500 }
      );
    }
  }
}

