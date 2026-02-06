import { NextRequest, NextResponse } from 'next/server';
import { ProductSectionsModel, CreateProductSectionsData } from '@/models/ProductSections';
import { prisma } from '@/lib/db';

export class ProductSectionsController {
  /**
   * Get all product sections with optional pagination
   */
  static async index(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams;
      const page = searchParams.get('page');
      const limit = searchParams.get('limit');
      const search = searchParams.get('search') || searchParams.get('q');
      const id = searchParams.get('id');
      const sectionName = searchParams.get('section_name');
      const sortParams = searchParams.getAll('sort');

      const params: {
        page?: number;
        limit?: number;
        search?: string;
        id?: string;
        section_name?: string;
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
      if (sectionName) {
        params.section_name = sectionName;
      }
      if (sortParams.length > 0) {
        params.sort = sortParams;
      }

      const result = await ProductSectionsModel.findAll(params);
      return NextResponse.json(result);
    } catch (error) {
      console.error('ProductSectionsController.index error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch product sections',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Get single product section by ID
   */
  static async show(request: NextRequest, id: number) {
    try {
      const section = await ProductSectionsModel.findById(id);

      if (!section) {
        return NextResponse.json(
          { success: false, error: 'Product section not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        section,
      });
    } catch (error) {
      console.error('ProductSectionsController.show error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch product section',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Create a new product section
   */
  static async create(request: NextRequest) {
    try {
      const body = await request.json();

      if (!body.section_name || !body.slug || body.show_hide === undefined || body.slider_type === undefined) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: section_name, slug, show_hide, slider_type' },
          { status: 400 }
        );
      }

      // Get max order_number if not provided
      const orderNumber = body.order_number !== undefined ? body.order_number : await this.getMaxOrderNumber() + 1;

      const sectionData: CreateProductSectionsData = {
        section_name: body.section_name,
        slug: body.slug,
        order_number: orderNumber,
        show_hide: body.show_hide,
        slider_type: body.slider_type,
        r_store_id: body.r_store_id ?? null,
        r_grid_id: body.r_grid_id ?? null,
      };

      const result = await ProductSectionsModel.create(sectionData);

      if (!result.success || !result.section) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || result.message || 'Failed to create product section',
          },
          { status: 400 }
        );
      }

      // Handle related products
      if (body.related_products && Array.isArray(body.related_products) && body.related_products.length > 0) {
        await this.saveSectionProducts(result.section.id, body.related_products);
      }

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      console.error('ProductSectionsController.create error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create product section',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Update product section
   */
  static async update(request: NextRequest, id: number) {
    try {
      const body = await request.json();

      const updateData: Partial<CreateProductSectionsData> = {};

      if (body.section_name !== undefined) updateData.section_name = body.section_name;
      if (body.slug !== undefined) updateData.slug = body.slug;
      if (body.order_number !== undefined) updateData.order_number = body.order_number;
      if (body.show_hide !== undefined) updateData.show_hide = body.show_hide;
      if (body.slider_type !== undefined) updateData.slider_type = body.slider_type;
      if (body.r_store_id !== undefined) updateData.r_store_id = body.r_store_id;
      if (body.r_grid_id !== undefined) updateData.r_grid_id = body.r_grid_id;

      const result = await ProductSectionsModel.update(id, updateData);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || result.message || 'Failed to update product section',
          },
          { status: 400 }
        );
      }

      // Handle related products - delete existing and add new ones
      if (body.related_products !== undefined) {
        await this.deleteSectionProducts(id);
        if (Array.isArray(body.related_products) && body.related_products.length > 0) {
          await this.saveSectionProducts(id, body.related_products);
        }
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('ProductSectionsController.update error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update product section',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Delete product section
   */
  static async delete(request: NextRequest, id: number) {
    try {
      const result = await ProductSectionsModel.delete(id);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to delete product section',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('ProductSectionsController.delete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete product section',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Bulk delete product sections
   */
  static async bulkDelete(request: NextRequest) {
    try {
      const body = await request.json();
      const { ids } = body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No product section IDs provided' },
          { status: 400 }
        );
      }

      const result = await ProductSectionsModel.bulkDelete(ids);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to delete product sections',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('ProductSectionsController.bulkDelete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete product sections',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Get max order number for product sections
   */
  private static async getMaxOrderNumber(): Promise<number> {
    try {
      const result = await prisma.$queryRawUnsafe<Array<{ max_order: bigint | null }>>(
        `SELECT MAX(order_number) as max_order FROM product_sections`
      );
      return result[0]?.max_order ? Number(result[0].max_order) : 0;
    } catch (error) {
      console.error('Error getting max order number:', error);
      return 0;
    }
  }

  /**
   * Save products for a section
   */
  private static async saveSectionProducts(sectionId: number, productIds: number[]): Promise<void> {
    try {
      if (!productIds || productIds.length === 0) return;

      // Use parameterized query for safety
      const placeholders = productIds.map(() => '(?, ?)').join(', ');
      const values: number[] = [];
      productIds.forEach(productId => {
        values.push(sectionId, productId);
      });
      
      await prisma.$executeRawUnsafe(
        `INSERT INTO product_sections_products (r_section_id, r_product_id) VALUES ${placeholders}`,
        ...values
      );
    } catch (error) {
      console.error('Error saving section products:', error);
      throw error;
    }
  }

  /**
   * Delete all products for a section
   */
  private static async deleteSectionProducts(sectionId: number): Promise<void> {
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM product_sections_products WHERE r_section_id = ?`,
        sectionId
      );
    } catch (error) {
      console.error('Error deleting section products:', error);
      throw error;
    }
  }

  /**
   * Get products for a section
   */
  static async getSectionProducts(request: NextRequest, id: number) {
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
      }>>(
        `SELECT 
          p.id,
          p.product_name,
          p.display_name,
          p.original_name,
          p.main_image,
          p.product_qty_left,
          b.brand_name,
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
        INNER JOIN product_sections_products psp ON p.id = psp.r_product_id
        LEFT JOIN brand b ON p.brand = b.id
        WHERE psp.r_section_id = ?
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
        })),
      });
    } catch (error) {
      console.error('ProductSectionsController.getSectionProducts error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch section products',
        },
        { status: 500 }
      );
    }
  }
}

