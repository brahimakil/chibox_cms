import { prisma } from '@/lib/db';

// ProductVariant interface
export interface ProductVariant {
  id: number;
  productId: number;
  skuId: string | null;
  variantName: string | null;
  propsIds: string | null;
  propsNames: string | null;
  variantImage: string | null;
  salePrice: number | null;
  originPrice: number | null;
  discountPrice: number | null;
  stock: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ProductVariantModel {
  /**
   * Find all variants for a product
   */
  static async findByProductId(productId: number): Promise<ProductVariant[]> {
    try {
      const query = `SELECT * FROM product_variant WHERE product_id = ? ORDER BY sort_order ASC, id ASC`;
      const result = await prisma.$queryRawUnsafe<any[]>(query, productId);
      
      if (!result || result.length === 0) {
        return [];
      }
      
      return result.map(row => this.transformRow(row));
    } catch (error) {
      console.error('ProductVariantModel.findByProductId error:', error);
      throw error;
    }
  }

  /**
   * Find variants for multiple products (bulk query)
   */
  static async findByProductIds(productIds: number[]): Promise<Map<number, ProductVariant[]>> {
    try {
      if (!productIds || productIds.length === 0) {
        return new Map();
      }

      const placeholders = productIds.map(() => '?').join(',');
      const query = `SELECT * FROM product_variant WHERE product_id IN (${placeholders}) ORDER BY product_id ASC, sort_order ASC, id ASC`;
      const result = await prisma.$queryRawUnsafe<any[]>(query, ...productIds);
      
      // Group variants by product_id
      const variantsMap = new Map<number, ProductVariant[]>();
      
      result.forEach(row => {
        const variant = this.transformRow(row);
        const productId = variant.productId;
        
        if (!variantsMap.has(productId)) {
          variantsMap.set(productId, []);
        }
        
        variantsMap.get(productId)!.push(variant);
      });
      
      return variantsMap;
    } catch (error) {
      console.error('ProductVariantModel.findByProductIds error:', error);
      throw error;
    }
  }

  /**
   * Transform database row to ProductVariant interface
   */
  private static transformRow(row: any): ProductVariant {
    return {
      id: Number(row.id),
      productId: Number(row.product_id),
      skuId: row.sku_id || null,
      variantName: row.variant_name || null,
      propsIds: row.props_ids || null,
      propsNames: row.props_names || null,
      variantImage: row.variant_image || null,
      salePrice: row.sale_price ? Number(row.sale_price) : null,
      originPrice: row.origin_price ? Number(row.origin_price) : null,
      discountPrice: row.discount_price ? Number(row.discount_price) : null,
      stock: Number(row.stock || 0),
      sortOrder: Number(row.sort_order || 0),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

