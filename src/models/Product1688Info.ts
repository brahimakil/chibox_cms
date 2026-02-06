import { prisma } from '@/lib/db';

// Product1688Info interface
export interface Product1688Info {
  id: number;
  productId: number;
  itemId: string | null;
  categoryId: string | null;
  rootCategoryId: string | null;
  productUrl: string | null;
  detailUrl: string | null;
  videoUrl: string | null;
  titleZh: string | null;
  titleEn: string | null;
  descriptionZh: string | null;
  descriptionEn: string | null;
  currency: number | null;
  originPrice: number | null;
  originPriceMin: number | null;
  originPriceMax: number | null;
  discountPrice: number | null;
  saleCount: number;
  saleQuantity90days: number;
  totalStock: number;
  isSoldOut: number;
  offerUnit: string | null;
  unitWeight: number | null;
  mixAmount: number | null;
  mixBegin: number | null;
  mixNum: number | null;
  deliveryLocation: string | null;
  deliveryLocationCode: string | null;
  deliveryFee: number | null;
  templateId: string | null;
  shopName: string | null;
  shopUrl: string | null;
  sellerLoginId: string | null;
  sellerUserId: string | null;
  sellerMemberId: string | null;
  supportDropShipping: number;
  supportCrossBorder: number;
  serviceTags: any | null;
  productProps: any | null;
  promotions: any | null;
  images: any | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Product1688InfoModel {
  /**
   * Find by product ID
   */
  static async findByProductId(productId: number): Promise<Product1688Info | null> {
    try {
      const query = `SELECT * FROM product_1688_info WHERE product_id = ? LIMIT 1`;
      const result = await prisma.$queryRawUnsafe<any[]>(query, productId);
      
      if (!result || result.length === 0) {
        return null;
      }
      
      return this.transformRow(result[0]);
    } catch (error) {
      console.error('Product1688InfoModel.findByProductId error:', error);
      throw error;
    }
  }

  /**
   * Transform database row to Product1688Info interface
   */
  private static transformRow(row: any): Product1688Info {
    return {
      id: Number(row.id),
      productId: Number(row.product_id),
      itemId: row.item_id || null,
      categoryId: row.category_id || null,
      rootCategoryId: row.root_category_id || null,
      productUrl: row.product_url || null,
      detailUrl: row.detail_url || null,
      videoUrl: row.video_url || null,
      titleZh: row.title_zh || null,
      titleEn: row.title_en || null,
      descriptionZh: row.description_zh || null,
      descriptionEn: row.description_en || null,
      currency: row.currency ? Number(row.currency) : null,
      originPrice: row.origin_price ? Number(row.origin_price) : null,
      originPriceMin: row.origin_price_min ? Number(row.origin_price_min) : null,
      originPriceMax: row.origin_price_max ? Number(row.origin_price_max) : null,
      discountPrice: row.discount_price ? Number(row.discount_price) : null,
      saleCount: Number(row.sale_count || 0),
      saleQuantity90days: Number(row.sale_quantity_90days || 0),
      totalStock: Number(row.total_stock || 0),
      isSoldOut: Number(row.is_sold_out || 0),
      offerUnit: row.offer_unit || null,
      unitWeight: row.unit_weight ? Number(row.unit_weight) : null,
      mixAmount: row.mix_amount ? Number(row.mix_amount) : null,
      mixBegin: row.mix_begin ? Number(row.mix_begin) : null,
      mixNum: row.mix_num ? Number(row.mix_num) : null,
      deliveryLocation: row.delivery_location || null,
      deliveryLocationCode: row.delivery_location_code || null,
      deliveryFee: row.delivery_fee ? Number(row.delivery_fee) : null,
      templateId: row.template_id || null,
      shopName: row.shop_name || null,
      shopUrl: row.shop_url || null,
      sellerLoginId: row.seller_login_id || null,
      sellerUserId: row.seller_user_id || null,
      sellerMemberId: row.seller_member_id || null,
      supportDropShipping: Number(row.support_drop_shipping || 0),
      supportCrossBorder: Number(row.support_cross_border || 0),
      serviceTags: row.service_tags || null,
      productProps: row.product_props || null,
      promotions: row.promotions || null,
      images: row.images || null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

