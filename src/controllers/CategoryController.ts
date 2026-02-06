import { NextRequest, NextResponse } from 'next/server';
import { CategoryModel, CreateCategoryData } from '@/models/Category';

export class CategoryController {
  /**
   * Get all categories with optional pagination
   */
  static async index(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams;
      const type = searchParams.get('type');
      const storeId = searchParams.get('store_id');
      const source = searchParams.get('source');
      const page = searchParams.get('page');
      const limit = searchParams.get('limit');
      const search = searchParams.get('search') || searchParams.get('q');
      const display = searchParams.get('display');
      // Column filters
      const id = searchParams.get('id');
      const categoryName = searchParams.get('category_name');
      const parent = searchParams.get('parent');
      const productCount = searchParams.get('product_count');
      const showInNavbar = searchParams.get('show_in_navbar');
      const orderNumber = searchParams.get('order_number');
      // Sorting parameters - can be multiple (e.g., sort=id:asc&sort=name:desc)
      const sortParams = searchParams.getAll('sort');

      const params: {
        type?: number;
        store_id?: number;
        source?: string;
        page?: number;
        limit?: number;
        search?: string;
        display?: number;
        id?: string;
        category_name?: string;
        parent?: number;
        product_count?: string;
        show_in_navbar?: number;
        order_number?: string;
        sort?: string[];
      } = {};

      if (type !== null) {
        params.type = parseInt(type);
      }
      if (storeId) {
        params.store_id = parseInt(storeId);
      }
      if (source) {
        params.source = source;
      }
      if (page) {
        params.page = parseInt(page);
      }
      if (limit) {
        params.limit = parseInt(limit);
      }
      if (search) {
        params.search = decodeURIComponent(search).trim();
      }
      if (display !== null && display !== undefined) {
        params.display = parseInt(display);
      }
      // Column filters
      if (id) {
        params.id = id;
      }
      if (categoryName) {
        params.category_name = categoryName;
      }
      if (parent !== null && parent !== undefined) {
        params.parent = parseInt(parent);
      }
      if (productCount) {
        params.product_count = productCount;
      }
      if (showInNavbar !== null && showInNavbar !== undefined) {
        params.show_in_navbar = parseInt(showInNavbar);
      }
      if (orderNumber) {
        params.order_number = orderNumber;
      }
      // Sorting parameters
      if (sortParams.length > 0) {
        params.sort = sortParams;
      }

      const result = await CategoryModel.findAll(params);
      return NextResponse.json(result);
    } catch (error) {
      console.error('CategoryController.index error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch categories',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Get category tree
   */
  static async tree(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams;
      const source = searchParams.get('source');

      const params: { source?: string } = {};
      if (source) {
        params.source = source;
      }

      const result = await CategoryModel.findTree(params);
      return NextResponse.json(result);
    } catch (error) {
      console.error('CategoryController.tree error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch category tree',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Get single category by ID
   */
  static async show(request: NextRequest, id: number) {
    try {
      const category = await CategoryModel.findById(id);

      if (!category) {
        return NextResponse.json(
          { success: false, error: 'Category not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        category,
      });
    } catch (error) {
      console.error('CategoryController.show error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch category',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Create a new category
   */
  static async create(request: NextRequest) {
    try {
      const body = await request.json();

      // Validate required fields
      if (!body.category_name || !body.slug || body.type === undefined) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: category_name, slug, type' },
          { status: 400 }
        );
      }

      const categoryData: CreateCategoryData = {
        category_name: body.category_name,
        slug: body.slug,
        type: body.type,
        parent: body.parent ?? null,
        show_in_navbar: body.show_in_navbar ?? 0,
        display: body.display ?? 1,
        cart_btn: body.cart_btn ?? 1,
        r_store_id: body.r_store_id ?? null,
        main_image: body.main_image ?? null,
        order_number: body.order_number ?? null,
      };

      const result = await CategoryModel.create(categoryData);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || result.message || 'Failed to create category',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      console.error('CategoryController.create error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create category',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Update category
   */
  static async update(request: NextRequest, id: number) {
    try {
      const body = await request.json();

      const updateData: Partial<CreateCategoryData> = {};

      if (body.category_name !== undefined) updateData.category_name = body.category_name;
      if (body.slug !== undefined) updateData.slug = body.slug;
      if (body.type !== undefined) updateData.type = body.type;
      if (body.parent !== undefined) updateData.parent = body.parent;
      if (body.show_in_navbar !== undefined) updateData.show_in_navbar = body.show_in_navbar;
      if (body.display !== undefined) updateData.display = body.display;
      if (body.cart_btn !== undefined) updateData.cart_btn = body.cart_btn;
      if (body.r_store_id !== undefined) updateData.r_store_id = body.r_store_id;
      if (body.main_image !== undefined) updateData.main_image = body.main_image;
      if (body.order_number !== undefined) updateData.order_number = body.order_number;

      const result = await CategoryModel.update(id, updateData);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || result.message || 'Failed to update category',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('CategoryController.update error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update category',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Delete category
   */
  static async delete(request: NextRequest, id: number) {
    try {
      const result = await CategoryModel.delete(id);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to delete category',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('CategoryController.delete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete category',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Bulk delete categories
   */
  static async bulkDelete(request: NextRequest) {
    try {
      const body = await request.json();
      const { ids } = body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No category IDs provided' },
          { status: 400 }
        );
      }

      const result = await CategoryModel.bulkDelete(ids);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to delete categories',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('CategoryController.bulkDelete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete categories',
        },
        { status: 500 }
      );
    }
  }
}

