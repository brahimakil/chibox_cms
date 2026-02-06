import { NextRequest, NextResponse } from 'next/server';
import { BrandModel, CreateBrandData } from '@/models/Brand';

export class BrandController {
  /**
   * Get all brands with optional pagination
   */
  static async index(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams;
      const page = searchParams.get('page');
      const limit = searchParams.get('limit');
      const search = searchParams.get('search') || searchParams.get('q');
      const id = searchParams.get('id');
      const brandName = searchParams.get('brand_name');
      const sortParams = searchParams.getAll('sort');

      const params: {
        page?: number;
        limit?: number;
        search?: string;
        id?: string;
        brand_name?: string;
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
      if (brandName) {
        params.brand_name = brandName;
      }
      if (sortParams.length > 0) {
        params.sort = sortParams;
      }

      const result = await BrandModel.findAll(params);
      return NextResponse.json(result);
    } catch (error) {
      console.error('BrandController.index error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch brands',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Get single brand by ID
   */
  static async show(request: NextRequest, id: number) {
    try {
      const brand = await BrandModel.findById(id);

      if (!brand) {
        return NextResponse.json(
          { success: false, error: 'Brand not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        brand,
      });
    } catch (error) {
      console.error('BrandController.show error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch brand',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Create a new brand
   */
  static async create(request: NextRequest) {
    try {
      const body = await request.json();

      if (!body.slug || body.order_number === undefined) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: slug, order_number' },
          { status: 400 }
        );
      }

      const brandData: CreateBrandData = {
        brand_name: body.brand_name ?? null,
        slug: body.slug,
        order_number: body.order_number,
        description: body.description ?? null,
        product_count: body.product_count ?? 0,
        main_image: body.main_image ?? null,
        r_store_id: body.r_store_id ?? null,
        r_grid_id: body.r_grid_id ?? null,
      };

      const result = await BrandModel.create(brandData);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || result.message || 'Failed to create brand',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      console.error('BrandController.create error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create brand',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Update brand
   */
  static async update(request: NextRequest, id: number) {
    try {
      const body = await request.json();

      const updateData: Partial<CreateBrandData> = {};

      if (body.brand_name !== undefined) updateData.brand_name = body.brand_name;
      if (body.slug !== undefined) updateData.slug = body.slug;
      if (body.order_number !== undefined) updateData.order_number = body.order_number;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.product_count !== undefined) updateData.product_count = body.product_count;
      if (body.main_image !== undefined) updateData.main_image = body.main_image;
      if (body.r_store_id !== undefined) updateData.r_store_id = body.r_store_id;
      if (body.r_grid_id !== undefined) updateData.r_grid_id = body.r_grid_id;

      const result = await BrandModel.update(id, updateData);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || result.message || 'Failed to update brand',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('BrandController.update error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update brand',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Delete brand
   */
  static async delete(request: NextRequest, id: number) {
    try {
      const result = await BrandModel.delete(id);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to delete brand',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('BrandController.delete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete brand',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Bulk delete brands
   */
  static async bulkDelete(request: NextRequest) {
    try {
      const body = await request.json();
      const { ids } = body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No brand IDs provided' },
          { status: 400 }
        );
      }

      const result = await BrandModel.bulkDelete(ids);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to delete brands',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('BrandController.bulkDelete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete brands',
        },
        { status: 500 }
      );
    }
  }
}

