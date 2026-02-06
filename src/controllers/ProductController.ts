import { NextRequest, NextResponse } from 'next/server';
import { ProductModel, CreateProductData } from '@/models/Product';

export class ProductController {
  /**
   * Get all products with optional pagination
   */
  static async index(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams;
      const storeId = searchParams.get('store_id');
      const page = searchParams.get('page');
      const limit = searchParams.get('limit');
      const search = searchParams.get('search') || searchParams.get('q');
      const categoryId = searchParams.get('category_id');
      const brand = searchParams.get('brand');
      const showOnWebsite = searchParams.get('show_on_website');
      const productStatus = searchParams.get('product_status');
      const hasOption = searchParams.get('has_option');
      const hasVariants = searchParams.get('has_variants');
      // Column filters
      const id = searchParams.get('id');
      const displayName = searchParams.get('display_name');
      const productName = searchParams.get('product_name');
      const productPrice = searchParams.get('product_price');
      const productQtyLeft = searchParams.get('product_qty_left');
      const freeShipping = searchParams.get('free_shipping');
      const flatRate = searchParams.get('flat_rate');
      const multiShipping = searchParams.get('multi_shipping');
      const categoryName = searchParams.get('category_name');
      // Sorting parameters - can be multiple (e.g., sort=id:asc&sort=name:desc)
      const sortParams = searchParams.getAll('sort');

      const params: {
        store_id?: number;
        page?: number;
        limit?: number;
        search?: string;
        category_id?: number;
        brand?: number;
        show_on_website?: number;
        product_status?: number;
        has_option?: number;
        has_variants?: number;
        id?: string;
        display_name?: string;
        product_name?: string;
        product_price?: string;
        product_qty_left?: string;
        free_shipping?: number;
        flat_rate?: number;
        multi_shipping?: number;
        category_name?: string;
        sort?: string[];
      } = {};

      if (storeId) {
        params.store_id = parseInt(storeId);
      }
      // Enforce pagination - default to page 1, limit 50
      params.page = page ? parseInt(page) : 1;
      params.limit = limit ? parseInt(limit) : 50;
      
      // Allow up to 500 rows per page (matching frontend options)
      // Note: Very large page sizes may impact performance, but user can choose
      if (params.limit > 500) {
        params.limit = 500;
      }
      if (search) {
        // URLSearchParams automatically decodes + to spaces, but let's ensure it's clean
        // Replace + with spaces (URLSearchParams should do this automatically, but be explicit)
        params.search = search.replace(/\+/g, ' ').trim();
        console.log(`[ProductController] Search query received: "${params.search}"`);
      }
      if (categoryId) {
        params.category_id = parseInt(categoryId);
      }
      if (brand) {
        params.brand = parseInt(brand);
      }
      if (showOnWebsite) {
        params.show_on_website = parseInt(showOnWebsite);
      }
      if (productStatus) {
        params.product_status = parseInt(productStatus);
      }
      if (hasOption) {
        params.has_option = parseInt(hasOption);
      }
      if (hasVariants !== null && hasVariants !== undefined) {
        params.has_variants = parseInt(hasVariants);
      }
      // Column filters
      if (id) {
        params.id = id;
      }
      if (displayName) {
        // Replace + with spaces (URLSearchParams should do this automatically, but be explicit)
        params.display_name = displayName.replace(/\+/g, ' ').trim();
      }
      if (productName) {
        // Replace + with spaces (URLSearchParams should do this automatically, but be explicit)
        params.product_name = productName.replace(/\+/g, ' ').trim();
      }
      if (productPrice) {
        params.product_price = productPrice;
      }
      if (productQtyLeft) {
        params.product_qty_left = productQtyLeft;
      }
      if (freeShipping !== null && freeShipping !== undefined) {
        params.free_shipping = parseInt(freeShipping);
      }
      if (flatRate !== null && flatRate !== undefined) {
        params.flat_rate = parseInt(flatRate);
      }
      if (multiShipping !== null && multiShipping !== undefined) {
        params.multi_shipping = parseInt(multiShipping);
      }
      if (categoryName) {
        // Replace + with spaces (URLSearchParams should do this automatically, but be explicit)
        params.category_name = categoryName.replace(/\+/g, ' ').trim();
      }
      // Sorting parameters
      if (sortParams.length > 0) {
        params.sort = sortParams;
      }

      const result = await ProductModel.findAll(params);
      return NextResponse.json(result);
    } catch (error) {
      console.error('ProductController.index error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch products',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Get single product by ID
   */
  static async show(request: NextRequest, id: number) {
    try {
      const product = await ProductModel.findById(id);

      if (!product) {
        return NextResponse.json(
          { success: false, error: 'Product not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        product,
      });
    } catch (error) {
      console.error('ProductController.show error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch product',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Create a new product
   */
  static async create(request: NextRequest) {
    try {
      const body = await request.json();

      // Validate required fields
      if (!body.product_code || !body.product_name || !body.slug || body.product_price === undefined || body.product_qty_left === undefined || body.currency_id === undefined) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: product_code, product_name, slug, product_price, product_qty_left, currency_id' },
          { status: 400 }
        );
      }

      const productData: CreateProductData = {
        product_code: body.product_code,
        product_name: body.product_name,
        slug: body.slug,
        product_price: body.product_price,
        product_qty_left: body.product_qty_left,
        currency_id: body.currency_id,
        description: body.description ?? null,
        model: body.model ?? null,
        brand: body.brand ?? null,
        product_cost: body.product_cost ?? body.product_price,
        has_option: body.has_option ?? 0,
        boolean_percent_discount: body.boolean_percent_discount ?? 0,
        sales_discount: body.sales_discount ?? null,
        product_condition: body.product_condition ?? null,
        free_shipping: body.free_shipping ?? 0,
        provider_price: body.provider_price ?? null,
        flat_rate: body.flat_rate ?? 0,
        multi_shipping: body.multi_shipping ?? 0,
        shipping_cost: body.shipping_cost ?? null,
        show_on_website: body.show_on_website ?? 1,
        product_section: body.product_section ?? null,
        main_image: body.main_image ?? null,
        r_store_id: body.r_store_id ?? null,
        r_flash_id: body.r_flash_id ?? null,
        express_delivery: body.express_delivery ?? 0,
        product_status: body.product_status ?? 32,
        out_of_stock: body.out_of_stock ?? 0,
      };

      const result = await ProductModel.create(productData);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || result.message || 'Failed to create product',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      console.error('ProductController.create error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create product',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Update product
   */
  static async update(request: NextRequest, id: number) {
    try {
      const body = await request.json();

      const updateData: Partial<CreateProductData> = {};

      if (body.product_code !== undefined) updateData.product_code = body.product_code;
      if (body.product_name !== undefined) updateData.product_name = body.product_name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.model !== undefined) updateData.model = body.model;
      if (body.brand !== undefined) updateData.brand = body.brand;
      if (body.product_qty_left !== undefined) updateData.product_qty_left = body.product_qty_left;
      if (body.product_cost !== undefined) updateData.product_cost = body.product_cost;
      if (body.product_price !== undefined) updateData.product_price = body.product_price;
      if (body.has_option !== undefined) updateData.has_option = body.has_option;
      if (body.boolean_percent_discount !== undefined) updateData.boolean_percent_discount = body.boolean_percent_discount;
      if (body.sales_discount !== undefined) updateData.sales_discount = body.sales_discount;
      if (body.product_condition !== undefined) updateData.product_condition = body.product_condition;
      if (body.free_shipping !== undefined) updateData.free_shipping = body.free_shipping;
      if (body.provider_price !== undefined) updateData.provider_price = body.provider_price;
      if (body.flat_rate !== undefined) updateData.flat_rate = body.flat_rate;
      if (body.multi_shipping !== undefined) updateData.multi_shipping = body.multi_shipping;
      if (body.shipping_cost !== undefined) updateData.shipping_cost = body.shipping_cost;
      if (body.show_on_website !== undefined) updateData.show_on_website = body.show_on_website;
      if (body.product_section !== undefined) updateData.product_section = body.product_section;
      if (body.main_image !== undefined) updateData.main_image = body.main_image;
      if (body.r_store_id !== undefined) updateData.r_store_id = body.r_store_id;
      if (body.r_flash_id !== undefined) updateData.r_flash_id = body.r_flash_id;
      if (body.slug !== undefined) updateData.slug = body.slug;
      if (body.currency_id !== undefined) updateData.currency_id = body.currency_id;
      if (body.express_delivery !== undefined) updateData.express_delivery = body.express_delivery;
      if (body.product_status !== undefined) updateData.product_status = body.product_status;
      if (body.out_of_stock !== undefined) updateData.out_of_stock = body.out_of_stock;

      const result = await ProductModel.update(id, updateData);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || result.message || 'Failed to update product',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('ProductController.update error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update product',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Delete product
   */
  static async delete(request: NextRequest, id: number) {
    try {
      const result = await ProductModel.delete(id);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to delete product',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('ProductController.delete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete product',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Bulk delete products
   */
  static async bulkDelete(request: NextRequest) {
    try {
      const body = await request.json();
      const { ids } = body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No product IDs provided' },
          { status: 400 }
        );
      }

      const result = await ProductModel.bulkDelete(ids);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to delete products',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('ProductController.bulkDelete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete products',
        },
        { status: 500 }
      );
    }
  }
}

