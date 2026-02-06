import { NextRequest, NextResponse } from 'next/server';
import { FlashSalesModel, CreateFlashSalesData } from '@/models/FlashSales';
import { prisma } from '@/lib/db';

export class FlashSalesController {
  /**
   * Get all flash sales with optional pagination
   */
  static async index(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams;
      const page = searchParams.get('page');
      const limit = searchParams.get('limit');
      const search = searchParams.get('search') || searchParams.get('q');
      const id = searchParams.get('id');
      const title = searchParams.get('title');
      const sortParams = searchParams.getAll('sort');

      const params: {
        page?: number;
        limit?: number;
        search?: string;
        id?: string;
        title?: string;
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
      if (title) {
        params.title = title;
      }
      if (sortParams.length > 0) {
        params.sort = sortParams;
      }

      const result = await FlashSalesModel.findAll(params);
      return NextResponse.json(result);
    } catch (error) {
      console.error('FlashSalesController.index error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch flash sales',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Get single flash sale by ID
   */
  static async show(request: NextRequest, id: number) {
    try {
      const flashSale = await FlashSalesModel.findById(id);

      if (!flashSale) {
        return NextResponse.json(
          { success: false, error: 'Flash sale not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        flashSale,
      });
    } catch (error) {
      console.error('FlashSalesController.show error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch flash sale',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Create a new flash sale
   */
  static async create(request: NextRequest) {
    try {
      const body = await request.json();

      if (!body.title || !body.slug || !body.color_1 || !body.color_2 || !body.color_3 || body.slider_type === undefined || body.r_store_id === undefined || body.discount === undefined) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: title, slug, color_1, color_2, color_3, slider_type, r_store_id, discount' },
          { status: 400 }
        );
      }

      // Validate products and discounts match
      if (body.related_products && body.discount_values) {
        if (body.related_products.length !== body.discount_values.length) {
          return NextResponse.json(
            { success: false, error: 'Number of products must match number of discount values' },
            { status: 400 }
          );
        }
      }

      // Get max order_number if not provided
      const orderNumber = body.order_number !== undefined ? body.order_number : await this.getMaxOrderNumber() + 1;

      const flashSaleData: CreateFlashSalesData = {
        title: body.title,
        slug: body.slug,
        color_1: body.color_1,
        color_2: body.color_2,
        color_3: body.color_3,
        end_time: body.end_time ? new Date(body.end_time) : null,
        display: body.display ?? 1,
        slider_type: body.slider_type,
        r_store_id: body.r_store_id,
        discount: body.discount,
        order_number: orderNumber,
      };

      const result = await FlashSalesModel.create(flashSaleData);

      if (!result.success || !result.flashSale) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || result.message || 'Failed to create flash sale',
          },
          { status: 400 }
        );
      }

      // Handle related products with discounts
      if (body.related_products && Array.isArray(body.related_products) && body.related_products.length > 0) {
        await this.saveFlashSaleProducts(result.flashSale.id, body.related_products, body.discount_values || []);
      }

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      console.error('FlashSalesController.create error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create flash sale',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Update flash sale
   */
  static async update(request: NextRequest, id: number) {
    try {
      const body = await request.json();

      const updateData: Partial<CreateFlashSalesData> = {};

      if (body.title !== undefined) updateData.title = body.title;
      if (body.slug !== undefined) updateData.slug = body.slug;
      if (body.color_1 !== undefined) updateData.color_1 = body.color_1;
      if (body.color_2 !== undefined) updateData.color_2 = body.color_2;
      if (body.color_3 !== undefined) updateData.color_3 = body.color_3;
      if (body.end_time !== undefined) updateData.end_time = body.end_time ? new Date(body.end_time) : null;
      if (body.display !== undefined) updateData.display = body.display;
      if (body.slider_type !== undefined) updateData.slider_type = body.slider_type;
      if (body.r_store_id !== undefined) updateData.r_store_id = body.r_store_id;
      if (body.discount !== undefined) updateData.discount = body.discount;
      if (body.order_number !== undefined) updateData.order_number = body.order_number;

      // Validate products and discounts match
      if (body.related_products !== undefined && body.discount_values !== undefined) {
        if (body.related_products.length !== body.discount_values.length) {
          return NextResponse.json(
            { success: false, error: 'Number of products must match number of discount values' },
            { status: 400 }
          );
        }
      }

      const result = await FlashSalesModel.update(id, updateData);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || result.message || 'Failed to update flash sale',
          },
          { status: 400 }
        );
      }

      // Handle related products - remove existing and add new ones
      if (body.related_products !== undefined) {
        await this.deleteFlashSaleProducts(id);
        if (Array.isArray(body.related_products) && body.related_products.length > 0) {
          await this.saveFlashSaleProducts(id, body.related_products, body.discount_values || []);
        }
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('FlashSalesController.update error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update flash sale',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Delete flash sale
   */
  static async delete(request: NextRequest, id: number) {
    try {
      // Delete associated products from flash_sales_products table first
      await this.deleteFlashSaleProducts(id);

      const result = await FlashSalesModel.delete(id);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to delete flash sale',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('FlashSalesController.delete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete flash sale',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Bulk delete flash sales
   */
  static async bulkDelete(request: NextRequest) {
    try {
      const body = await request.json();
      const { ids } = body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No flash sale IDs provided' },
          { status: 400 }
        );
      }

      // Delete associated products from flash_sales_products table for each flash sale
      for (const id of ids) {
        await this.deleteFlashSaleProducts(id);
      }

      const result = await FlashSalesModel.bulkDelete(ids);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to delete flash sales',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('FlashSalesController.bulkDelete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete flash sales',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Get max order number for flash sales
   */
  private static async getMaxOrderNumber(): Promise<number> {
    try {
      const result = await prisma.$queryRawUnsafe<Array<{ max_order: bigint | null }>>(
        `SELECT MAX(order_number) as max_order FROM flash_sales`
      );
      return result[0]?.max_order ? Number(result[0].max_order) : 0;
    } catch (error) {
      console.error('Error getting max order number:', error);
      return 0;
    }
  }

  /**
   * Save products for a flash sale with discounts
   */
  private static async saveFlashSaleProducts(flashSaleId: number, productIds: number[], discountValues: number[]): Promise<void> {
    try {
      if (!productIds || productIds.length === 0) return;
      if (productIds.length !== discountValues.length) {
        throw new Error('Number of products must match number of discount values');
      }

      // First, delete existing flash_sales_products records for this flash sale
      await prisma.$executeRawUnsafe(
        `DELETE FROM flash_sales_products WHERE r_flash_id = ?`,
        flashSaleId
      );

      // Update products: set r_flash_id, sales_discount, and boolean_percent_discount
      for (let i = 0; i < productIds.length; i++) {
        const productId = productIds[i];
        const discount = discountValues[i];

        // First, save old_discount if sales_discount exists
        const product = await prisma.$queryRawUnsafe<Array<{
          sales_discount: number | null;
          old_discount: number | null;
        }>>(
          `SELECT sales_discount, old_discount FROM product WHERE id = ? LIMIT 1`,
          productId
        );

        if (product && product.length > 0 && product[0].sales_discount && !product[0].old_discount) {
          await prisma.$executeRawUnsafe(
            `UPDATE product SET old_discount = ? WHERE id = ?`,
            product[0].sales_discount,
            productId
          );
        }

        // Update product with flash sale info
        await prisma.$executeRawUnsafe(
          `UPDATE product SET r_flash_id = ?, sales_discount = ?, boolean_percent_discount = 1 WHERE id = ?`,
          flashSaleId,
          discount,
          productId
        );

        // Save to flash_sales_products junction table
        await prisma.$executeRawUnsafe(
          `INSERT INTO flash_sales_products (r_flash_id, r_product_id) VALUES (?, ?)`,
          flashSaleId,
          productId
        );
      }
    } catch (error) {
      console.error('Error saving flash sale products:', error);
      throw error;
    }
  }

  /**
   * Delete all products for a flash sale (reset their flash sale fields)
   */
  private static async deleteFlashSaleProducts(flashSaleId: number): Promise<void> {
    try {
      // Delete from flash_sales_products junction table
      await prisma.$executeRawUnsafe(
        `DELETE FROM flash_sales_products WHERE r_flash_id = ?`,
        flashSaleId
      );
      
      // Reset product flash sale fields
      await prisma.$executeRawUnsafe(
        `UPDATE product SET r_flash_id = NULL, sales_discount = NULL, boolean_percent_discount = 0 WHERE r_flash_id = ?`,
        flashSaleId
      );
    } catch (error) {
      console.error('Error deleting flash sale products:', error);
      throw error;
    }
  }

  /**
   * Get products for a flash sale
   */
  static async getFlashSaleProducts(request: NextRequest, id: number) {
    try {
      const products = await prisma.$queryRawUnsafe<Array<{
        id: number;
        product_name: string | null;
        display_name: string | null;
        original_name: string | null;
        main_image: string | null;
        product_qty_left: number;
        brand_name: string | null;
        image_count: bigint;
        categories: string | null;
        store_name: string | null;
        sales_discount: number | null;
      }>>(
        `SELECT 
          p.id,
          p.product_name,
          p.display_name,
          p.original_name,
          p.main_image,
          p.product_qty_left,
          p.sales_discount,
          b.brand_name,
          s.store_name,
          (SELECT COUNT(aa.id) 
           FROM ag_attachment aa 
           WHERE aa.row_id = p.id 
           AND aa.table_name = 154 
           AND aa.type = 2) as image_count,
          (SELECT GROUP_CONCAT(c.category_name SEPARATOR ', ') 
           FROM product_categories pc 
           INNER JOIN category c ON c.id = pc.r_category_id 
           WHERE pc.product_id = p.id) as categories
        FROM product p
        INNER JOIN flash_sales_products fsp ON p.id = fsp.r_product_id
        LEFT JOIN brand b ON p.brand = b.id
        LEFT JOIN stores s ON p.r_store_id = s.id
        WHERE fsp.r_flash_id = ?
        ORDER BY p.id ASC`,
        id
      );

      return NextResponse.json({
        success: true,
        products: products.map(p => ({
          id: Number(p.id),
          productName: p.product_name,
          displayName: p.display_name,
          originalName: p.original_name,
          mainImage: p.main_image,
          productQtyLeft: Number(p.product_qty_left || 0),
          brandName: p.brand_name,
          imageCount: Number(p.image_count || 0),
          categories: p.categories,
          storeName: p.store_name,
          salesDiscount: p.sales_discount ? Number(p.sales_discount) : 0,
        })),
      });
    } catch (error) {
      console.error('FlashSalesController.getFlashSaleProducts error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch flash sale products',
        },
        { status: 500 }
      );
    }
  }
}

