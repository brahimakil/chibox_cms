import { NextRequest, NextResponse } from 'next/server';
import { GridElementsModel, CreateGridElementData } from '@/models/GridElements';
import { GridsModel } from '@/models/Grids';

export class GridElementsController {
  /**
   * Get all elements for a grid with optional pagination
   */
  static async index(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams;
      const page = searchParams.get('page');
      const limit = searchParams.get('limit');
      const gridId = searchParams.get('grid_id');
      const sortParams = searchParams.getAll('sort');

      const params: {
        page?: number;
        limit?: number;
        gridId?: number;
        sort?: string[];
      } = {};

      params.page = page ? parseInt(page) : 1;
      params.limit = limit ? parseInt(limit) : 50;
      
      if (params.limit > 500) {
        params.limit = 500;
      }
      if (gridId) {
        params.gridId = parseInt(gridId);
      }
      if (sortParams.length > 0) {
        params.sort = sortParams;
      }

      const result = await GridElementsModel.findAll(params);
      return NextResponse.json(result);
    } catch (error) {
      console.error('GridElementsController.index error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch grid elements',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Get elements by grid ID
   */
  static async byGrid(request: NextRequest, gridId: number) {
    try {
      const searchParams = request.nextUrl.searchParams;
      const page = searchParams.get('page');
      const limit = searchParams.get('limit');

      // Verify grid exists
      const grid = await GridsModel.findById(gridId);
      if (!grid) {
        return NextResponse.json(
          { success: false, error: 'Grid not found' },
          { status: 404 }
        );
      }

      const result = await GridElementsModel.findByGridId(gridId, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50,
      });

      return NextResponse.json({
        ...result,
        grid: {
          id: grid.id,
          type: grid.type,
        },
      });
    } catch (error) {
      console.error('GridElementsController.byGrid error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch grid elements',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Get single element by ID
   */
  static async show(request: NextRequest, id: number) {
    try {
      const element = await GridElementsModel.findById(id);

      if (!element) {
        return NextResponse.json(
          { success: false, error: 'Grid element not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        element,
      });
    } catch (error) {
      console.error('GridElementsController.show error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch grid element',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Create a new grid element
   */
  static async create(request: NextRequest) {
    try {
      const body = await request.json();

      if (!body.r_grid_id) {
        return NextResponse.json(
          { success: false, error: 'Missing required field: r_grid_id' },
          { status: 400 }
        );
      }

      // Verify grid exists
      const grid = await GridsModel.findById(body.r_grid_id);
      if (!grid) {
        return NextResponse.json(
          { success: false, error: 'Grid not found' },
          { status: 404 }
        );
      }

      const elementData: CreateGridElementData = {
        r_grid_id: body.r_grid_id,
        position_x: body.position_x ?? '0',
        position_y: body.position_y ?? '0',
        width: body.width ?? '100',
        height: body.height ?? '100',
        actions: body.actions ?? null,
        main_image: body.main_image ?? null,
      };

      const result = await GridElementsModel.create(elementData);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || result.message || 'Failed to create grid element',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      console.error('GridElementsController.create error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create grid element',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Update grid element
   */
  static async update(request: NextRequest, id: number) {
    try {
      const body = await request.json();

      const updateData: Partial<CreateGridElementData> = {};

      if (body.r_grid_id !== undefined) updateData.r_grid_id = body.r_grid_id;
      if (body.position_x !== undefined) updateData.position_x = body.position_x;
      if (body.position_y !== undefined) updateData.position_y = body.position_y;
      if (body.width !== undefined) updateData.width = body.width;
      if (body.height !== undefined) updateData.height = body.height;
      if (body.actions !== undefined) updateData.actions = body.actions;
      if (body.main_image !== undefined) updateData.main_image = body.main_image;

      const result = await GridElementsModel.update(id, updateData);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || result.message || 'Failed to update grid element',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('GridElementsController.update error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update grid element',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Delete grid element
   */
  static async delete(request: NextRequest, id: number) {
    try {
      const result = await GridElementsModel.delete(id);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to delete grid element',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('GridElementsController.delete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete grid element',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Bulk delete grid elements
   */
  static async bulkDelete(request: NextRequest) {
    try {
      const body = await request.json();
      const { ids } = body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No element IDs provided' },
          { status: 400 }
        );
      }

      const result = await GridElementsModel.bulkDelete(ids);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to delete grid elements',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('GridElementsController.bulkDelete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete grid elements',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Update positions for multiple elements
   */
  static async updatePositions(request: NextRequest) {
    try {
      const body = await request.json();
      const { positions } = body;

      if (!positions || !Array.isArray(positions) || positions.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No positions provided' },
          { status: 400 }
        );
      }

      const result = await GridElementsModel.updatePositions(positions);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to update positions',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('GridElementsController.updatePositions error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update positions',
        },
        { status: 500 }
      );
    }
  }
}
