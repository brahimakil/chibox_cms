import { prisma } from '@/lib/db';
import { convertPrice, getCurrencySymbol } from '@/lib/currency';

// Product interface matching Prisma schema
// Note: After running npx prisma generate, you can use Prisma types directly
export interface Product {
  id: number;
  source: string | null;
  sourceProductId: string | null;
  productCode: string;
  productName: string;
  displayName: string | null;
  description: string | null;
  displayDescription: string | null;
  originalName: string | null;
  originalDescription: string | null;
  model: string | null;
  brand: number | null;
  providerBrandId: number | null;
  productQtyLeft: number;
  productCost: number;
  productPrice: number;
  hasOption: number;
  booleanPercentDiscount: number;
  salesDiscount: number | null;
  productCondition: number | null;
  freeShipping: number;
  providerPrice: number | null;
  flatRate: number;
  multiShipping: number;
  shippingCost: number | null;
  showOnWebsite: number;
  productSection: number | null;
  categoryId: number | null;
  mainImage: string | null;
  attachmentCounter: number | null;
  lockedBy: number | null;
  createdBy: number;
  updatedBy: number | null;
  createdAt: Date | null; // Can be null if invalid date in DB
  updatedAt: Date | null; // Can be null if invalid date in DB
  rStoreId: number | null;
  rFlashId: number | null;
  slug: string;
  currencyId: number;
  expressDelivery: number;
  syncId: string | null;
  productStatus: number;
  outOfStock: number;
  viewCount: number;
  imagesJson: any | null;
  videoUrl: string | null;
  shopLoginId: string | null;
  shopUrl: string | null;
  shopCompanyName: string | null;
  shopIsSuperFactory: number | null;
  shopRepurchaseRate: string | null;
  salesCount: number;
  buyerCount: number;
  productUrl: string | null;
  originPrice: number | null;
  showPrice: number | null;
  salePrice: number | null;
  quantityBegin: number | null;
  isComplete: number;
  isSyncing: number;
  isNew: number;
  discoveredAt: Date | null;
  lastSyncedAt: Date | null;
  nextSyncAt: Date | null;
  syncPriority: string;
  syncFailures: number;
  lastSyncError: string | null;
  contentHash: string | null;
  priceHash: string | null;
  lastViewedAt: Date | null;
  oldDiscount: number | null;
  karat: number | null;
  // Fields from product_1688_info table
  titleZh?: string | null;
  titleEn?: string | null;
  descriptionZh?: string | null;
  descriptionEn?: string | null;
  infoVideoUrl?: string | null;
  serviceTags?: any | null;
  productProps?: any | null;
  images?: any | null;
  infoOriginPrice?: number | null;
  // Computed fields
  rating?: number | null;
  reviewsCount?: number;
  variantsCount?: number; // Count of variants (used in list view)
  convertedPrice?: number | null; // Price converted to USD
  currencySymbol?: string; // Currency symbol (usually $)
  // Relations (LEGACY - old variant structure)
  variations?: ProductVariant[]; // Full variant data (used in detail view)
  // NEW variant structure matching PHP backend
  options?: ProductOption[]; // Variant options (Color, Size, etc.)
  variationsNew?: ProductVariation[]; // New variations with selected_options
}

// ProductVariant interface (LEGACY - for old variations/SKUs)
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
  convertedPrice?: number | null; // Price converted to USD
  currencySymbol?: string; // Currency symbol
}

// New variant structure matching PHP backend

// Product Option Value (e.g., Red, Blue, S, M)
export interface ProductOptionValue {
  id: number;
  r_product_option_id: number;
  name: string;
  vid: string | null;
  is_color: number;
  color: string | null;
  image_url: string | null;
}

// Product Option (e.g., Color, Size)
export interface ProductOption {
  id: number;
  pid: string | null;
  name: string;
  is_color: number;
  values: ProductOptionValue[];
}

// Selected option in a variation
export interface SelectedOption {
  r_product_option_id: number;
  option_id: number;
  value_id: number;
  value_name: string;
  image_url: string | null;
}

// Product Variation (NEW structure matching PHP backend)
export interface ProductVariation {
  id: number;
  sku_id: string | null;
  variation_name: string | null;
  props_ids: string | null;
  price: number | null;
  currency_symbol: string;
  variation_image: string | null;
  status: string;
  selected_options: SelectedOption[];
  cart_quantity: number;
}

export interface CreateProductData {
  product_code: string;
  product_name: string;
  description?: string | null;
  model?: string | null;
  brand?: number | null;
  product_qty_left: number;
  product_cost: number;
  product_price: number;
  has_option?: number;
  boolean_percent_discount?: number;
  sales_discount?: number | null;
  product_condition?: number | null;
  free_shipping?: number;
  provider_price?: number | null;
  flat_rate?: number;
  multi_shipping?: number;
  shipping_cost?: number | null;
  show_on_website?: number;
  product_section?: number | null;
  main_image?: string | null;
  r_store_id?: number | null;
  r_flash_id?: number | null;
  slug: string;
  currency_id: number;
  express_delivery?: number;
  product_status?: number;
  out_of_stock?: number;
}

export interface ProductListResponse {
  success: boolean;
  total: number;
  products: Product[];
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface ProductResponse {
  success: boolean;
  product?: Product;
  message?: string;
  error?: string;
}

export class ProductModel {
  /**
   * Fetch all products with optional pagination and filters
   * Default pagination: 50 items per page to prevent performance issues
   */
  static async findAll(params?: {
    store_id?: number;
    page?: number;
    limit?: number;
    search?: string;
    category_id?: number;
    brand?: number;
    show_on_website?: number;
    product_status?: number;
    has_option?: number;
    has_variants?: number; // Filter by variants (0 = no variants, 1 = has variants)
    // Column filters
    id?: string; // Filter by ID (exact or range)
    display_name?: string; // Filter by display name (LIKE search)
    product_name?: string; // Filter by product name (LIKE search)
    product_price?: string; // Filter by price (exact or range)
    product_qty_left?: string; // Filter by quantity (exact or range)
    free_shipping?: number; // Filter by free shipping (0 or 1)
    flat_rate?: number; // Filter by flat rate (0 or 1)
    multi_shipping?: number; // Filter by multi shipping (0 or 1)
    category_name?: string; // Filter by category name (LIKE search)
    sort?: string[]; // Sorting parameters (e.g., ["id:asc", "product_name:desc"])
  }): Promise<ProductListResponse> {
    try {
      // Enforce pagination - default to page 1, limit 50
      const page = params?.page || 1;
      const limit = params?.limit || 50;

      // Build WHERE conditions using MySQL placeholders (?)
      const conditions: string[] = [];
      const values: any[] = [];

      if (params?.store_id) {
        conditions.push(`p.r_store_id = ?`);
        values.push(params.store_id);
      }

      if (params?.brand) {
        conditions.push(`p.brand = ?`);
        values.push(params.brand);
      }

      if (params?.show_on_website !== undefined) {
        conditions.push(`p.show_on_website = ?`);
        values.push(params.show_on_website);
      }

      if (params?.product_status !== undefined) {
        conditions.push(`p.product_status = ?`);
        values.push(params.product_status);
        
      }

      if (params?.has_option !== undefined) {
        conditions.push(`p.has_option = ?`);
        values.push(params.has_option);
      }

      if (params?.has_variants !== undefined) {
        // Filter by whether product has variants or not
        if (params.has_variants === 1) {
          // Has variants: variant count > 0
          conditions.push(`(SELECT COUNT(*) FROM product_variant pv WHERE pv.product_id = p.id) > 0`);
        } else {
          // No variants: variant count = 0
          conditions.push(`(SELECT COUNT(*) FROM product_variant pv WHERE pv.product_id = p.id) = 0`);
        }
      }

      if (params?.category_id) {
        conditions.push(`p.category_id = ?`);
        values.push(params.category_id);
      }

      if (params?.search) {
        // Search in product_name, display_name, product_code, and description
        // Use LOWER() for case-insensitive search
        conditions.push(`(
          LOWER(p.product_name) LIKE LOWER(?) OR 
          LOWER(p.display_name) LIKE LOWER(?) OR
          LOWER(p.product_code) LIKE LOWER(?) OR 
          LOWER(p.description) LIKE LOWER(?)
        )`);
        const searchPattern = `%${params.search}%`;
        values.push(searchPattern, searchPattern, searchPattern, searchPattern);
        
      }

      // Column filters
      if (params?.id) {
        // Support exact match or range (e.g., "5" or "5-10")
        if (params.id.includes('-')) {
          const [min, max] = params.id.split('-').map(v => v.trim());
          if (min && max) {
            conditions.push(`p.id >= ? AND p.id <= ?`);
            values.push(parseInt(min), parseInt(max));
          } else if (min) {
            conditions.push(`p.id >= ?`);
            values.push(parseInt(min));
          }
        } else {
          conditions.push(`p.id = ?`);
          values.push(parseInt(params.id));
        }
      }

      if (params?.display_name) {
        // Filter by display name (LIKE search)
        conditions.push(`LOWER(p.display_name) LIKE LOWER(?)`);
        const namePattern = `%${params.display_name}%`;
        values.push(namePattern);
      }

      if (params?.product_name) {
        // Filter by product name (LIKE search)
        conditions.push(`LOWER(p.product_name) LIKE LOWER(?)`);
        const namePattern = `%${params.product_name}%`;
        values.push(namePattern);
      }

      if (params?.product_price) {
        // Support exact match or range
        if (params.product_price.includes('-')) {
          const [min, max] = params.product_price.split('-').map(v => v.trim());
          if (min && max) {
            conditions.push(`p.product_price >= ? AND p.product_price <= ?`);
            values.push(parseFloat(min), parseFloat(max));
          } else if (min) {
            conditions.push(`p.product_price >= ?`);
            values.push(parseFloat(min));
          }
        } else {
          conditions.push(`p.product_price = ?`);
          values.push(parseFloat(params.product_price));
        }
      }

      if (params?.product_qty_left) {
        // Support exact match or range
        if (params.product_qty_left.includes('-')) {
          const [min, max] = params.product_qty_left.split('-').map(v => v.trim());
          if (min && max) {
            conditions.push(`p.product_qty_left >= ? AND p.product_qty_left <= ?`);
            values.push(parseInt(min), parseInt(max));
          } else if (min) {
            conditions.push(`p.product_qty_left >= ?`);
            values.push(parseInt(min));
          }
        } else {
          conditions.push(`p.product_qty_left = ?`);
          values.push(parseInt(params.product_qty_left));
        }
      }

      if (params?.free_shipping !== undefined) {
        conditions.push(`p.free_shipping = ?`);
        values.push(params.free_shipping);
      }

      if (params?.flat_rate !== undefined) {
        conditions.push(`p.flat_rate = ?`);
        values.push(params.flat_rate);
      }

      if (params?.multi_shipping !== undefined) {
        conditions.push(`p.multi_shipping = ?`);
        values.push(params.multi_shipping);
      }

      const needsCategoryJoin = params?.category_name !== undefined;
      
      if (params?.category_name) {
        // Filter by category name (LIKE search)
        conditions.push(`LOWER(c.category_name) LIKE LOWER(?)`);
        const categoryPattern = `%${params.category_name}%`;
        values.push(categoryPattern);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count - execute in parallel with data query for better performance
      // Include LEFT JOIN with category table if we're filtering by category_name
      const countJoinClause = needsCategoryJoin ? 'LEFT JOIN category c ON p.category_id = c.id' : '';
      const countStartTime = Date.now();
      const countQuery = `SELECT COUNT(*) as count FROM product p ${countJoinClause} ${whereClause}`.trim().replace(/\s+/g, ' ');
      
      // Execute count query
      const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        countQuery,
        ...values
      );
      const total = Number(countResult[0]?.count || 0);
      const countTime = Date.now() - countStartTime;
      console.log(`[ProductModel] Count query completed in ${countTime}ms, total: ${total}`);

      // Build ORDER BY clause from sort parameters
      // Map API column names (snake_case) to database column names
      const columnMap: Record<string, string> = {
        'id': 'p.id',
        'display_name': 'p.display_name',
        'product_name': 'p.product_name',
        'product_price': 'p.product_price',
        'product_qty_left': 'p.product_qty_left',
        'has_option': 'p.has_option',
        'show_on_website': 'p.show_on_website',
        'product_status': 'p.product_status',
        'free_shipping': 'p.free_shipping',
        'flat_rate': 'p.flat_rate',
        'multi_shipping': 'p.multi_shipping',
        'product_code': 'p.product_code',
        'created_at': 'p.created_at',
        'updated_at': 'p.updated_at',
        'brand': 'p.brand',
        'category_id': 'p.category_id',
        'category_name': 'c.category_name',
      };

      let orderByClause = '';
      if (params?.sort && params.sort.length > 0) {
        const orderByParts: string[] = [];
        params.sort.forEach((sortParam) => {
          const [column, direction] = sortParam.split(':');
          const dbColumn = columnMap[column] || `p.${column}`;
          const sortDirection = direction?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
          // Validate column name to prevent SQL injection
          if (columnMap[column] || /^[a-z_]+$/.test(column)) {
            orderByParts.push(`${dbColumn} ${sortDirection}`);
          }
        });
        if (orderByParts.length > 0) {
          orderByClause = `ORDER BY ${orderByParts.join(', ')}`;
        }
      }
      
      // Default sorting if no sort parameters provided
      if (!orderByClause) {
        orderByClause = 'ORDER BY p.id DESC';
      }

      // Build query with date casting to handle invalid dates
      const offset = (page - 1) * limit;
      const query = `SELECT 
        p.id, p.source, p.source_product_id, p.product_code, p.product_name, p.display_name,
        p.description, p.display_description, p.original_name, p.original_description,
        p.model, p.brand, p.provider_brand_id, p.product_qty_left, p.product_cost, p.product_price,
        p.has_option, p.boolean_percent_discount, p.sales_discount, p.product_condition,
        p.free_shipping, p.provider_price, p.flat_rate, p.multi_shipping, p.shipping_cost,
        p.show_on_website, p.product_section, p.category_id, p.main_image, p.attachment_counter,
        p.locked_by, p.created_by, p.updated_by,
        CAST(p.created_at AS CHAR) as created_at,
        CAST(p.updated_at AS CHAR) as updated_at,
        p.r_store_id, p.r_flash_id, p.slug, p.currency_id, p.express_delivery, p.sync_id,
        p.product_status, p.out_of_stock, p.view_count, p.images_json, p.video_url,
        p.shop_login_id, p.shop_url, p.shop_company_name, p.shop_is_super_factory,
        p.shop_repurchase_rate, p.sales_count, p.buyer_count, p.product_url,
        p.origin_price, p.show_price, p.sale_price, p.quantity_begin, p.is_complete,
        p.is_syncing, p.is_new,
        CAST(p.discovered_at AS CHAR) as discovered_at,
        CAST(p.last_synced_at AS CHAR) as last_synced_at,
        CAST(p.next_sync_at AS CHAR) as next_sync_at,
        p.sync_priority, p.sync_failures, p.last_sync_error, p.content_hash, p.price_hash,
        CAST(p.last_viewed_at AS CHAR) as last_viewed_at,
        p.old_discount, p.karat,
        c.category_name,
        pi.title_zh, pi.title_en, pi.description_zh, pi.description_en,
        pi.video_url as info_video_url, pi.service_tags, pi.product_props,
        pi.images as info_images, pi.origin_price as info_origin_price,
        (SELECT AVG(ur.rating) FROM users_reviews ur WHERE ur.r_product_id = p.id) as rating,
        (SELECT COUNT(ur.id) FROM users_reviews ur WHERE ur.r_product_id = p.id) as reviews_count,
        (SELECT COUNT(pv.id) FROM product_variant pv WHERE pv.product_id = p.id) as variants_count
      FROM product p
      LEFT JOIN category c ON p.category_id = c.id
      LEFT JOIN product_1688_info pi ON p.id = pi.product_id
      ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`;
      
      const queryValues = [...values, limit, offset];

      // Use raw query to handle invalid dates gracefully
      console.log(`[ProductModel] Executing query with limit ${limit}, offset ${offset}`);
      const startTime = Date.now();
      const rawProducts = await prisma.$queryRawUnsafe<any[]>(query, ...queryValues);
      const queryTime = Date.now() - startTime;
      console.log(`[ProductModel] Query completed in ${queryTime}ms, returned ${rawProducts.length} rows`);

      // Transform raw results to match Product interface
      const products: Product[] = rawProducts.map((row: any) => ({
        id: Number(row.id),
        source: row.source || null,
        sourceProductId: row.source_product_id || null,
        productCode: row.product_code || '',
        productName: row.product_name || '',
        displayName: row.display_name || null,
        description: row.description || null,
        displayDescription: row.display_description || null,
        originalName: row.original_name || null,
        originalDescription: row.original_description || null,
        model: row.model || null,
        brand: row.brand ? Number(row.brand) : null,
        providerBrandId: row.provider_brand_id ? Number(row.provider_brand_id) : null,
        productQtyLeft: Number(row.product_qty_left || 0),
        productCost: Number(row.product_cost || 0),
        productPrice: Number(row.product_price || 0),
        hasOption: Number(row.has_option || 0),
        booleanPercentDiscount: Number(row.boolean_percent_discount || 0),
        salesDiscount: row.sales_discount ? Number(row.sales_discount) : null,
        productCondition: row.product_condition ? Number(row.product_condition) : null,
        freeShipping: Number(row.free_shipping || 0),
        providerPrice: row.provider_price ? Number(row.provider_price) : null,
        flatRate: Number(row.flat_rate || 0),
        multiShipping: Number(row.multi_shipping || 0),
        shippingCost: row.shipping_cost ? Number(row.shipping_cost) : null,
        showOnWebsite: Number(row.show_on_website ?? 1),
        productSection: row.product_section ? Number(row.product_section) : null,
        categoryId: row.category_id ? Number(row.category_id) : null,
        mainImage: row.main_image || null,
        attachmentCounter: row.attachment_counter ? Number(row.attachment_counter) : null,
        lockedBy: row.locked_by ? Number(row.locked_by) : null,
        createdBy: Number(row.created_by || 0),
        updatedBy: row.updated_by ? Number(row.updated_by) : null,
        createdAt: this.parseDate(row.created_at),
        updatedAt: this.parseDate(row.updated_at),
        rStoreId: row.r_store_id ? Number(row.r_store_id) : null,
        rFlashId: row.r_flash_id ? Number(row.r_flash_id) : null,
        slug: row.slug || '',
        currencyId: Number(row.currency_id || 1),
        expressDelivery: Number(row.express_delivery || 0),
        syncId: row.sync_id || null,
        productStatus: Number(row.product_status || 32),
        outOfStock: Number(row.out_of_stock || 0),
        viewCount: Number(row.view_count || 0),
        imagesJson: row.images_json || null,
        videoUrl: row.video_url || null,
        shopLoginId: row.shop_login_id || null,
        shopUrl: row.shop_url || null,
        shopCompanyName: row.shop_company_name || null,
        shopIsSuperFactory: row.shop_is_super_factory ? Number(row.shop_is_super_factory) : null,
        shopRepurchaseRate: row.shop_repurchase_rate || null,
        salesCount: Number(row.sales_count || 0),
        buyerCount: Number(row.buyer_count || 0),
        productUrl: row.product_url || null,
        originPrice: row.origin_price ? Number(row.origin_price) : null,
        showPrice: row.show_price ? Number(row.show_price) : null,
        salePrice: row.sale_price ? Number(row.sale_price) : null,
        quantityBegin: row.quantity_begin ? Number(row.quantity_begin) : null,
        isComplete: Number(row.is_complete || 0),
        isSyncing: Number(row.is_syncing || 0),
        isNew: Number(row.is_new || 0),
        discoveredAt: this.parseDate(row.discovered_at),
        lastSyncedAt: this.parseDate(row.last_synced_at),
        nextSyncAt: this.parseDate(row.next_sync_at),
        syncPriority: row.sync_priority || 'normal',
        syncFailures: Number(row.sync_failures || 0),
        lastSyncError: row.last_sync_error || null,
        contentHash: row.content_hash || null,
        priceHash: row.price_hash || null,
        lastViewedAt: this.parseDate(row.last_viewed_at),
        oldDiscount: row.old_discount ? Number(row.old_discount) : null,
        karat: row.karat ? Number(row.karat) : null,
        // Include category_name from join
        categoryName: row.category_name || null,
        // Include fields from product_1688_info
        titleZh: row.title_zh || null,
        titleEn: row.title_en || null,
        descriptionZh: row.description_zh || null,
        descriptionEn: row.description_en || null,
        infoVideoUrl: row.info_video_url || null,
        serviceTags: row.service_tags || null,
        productProps: row.product_props || null,
        images: row.info_images || null,
        infoOriginPrice: row.info_origin_price ? Number(row.info_origin_price) : null,
        // Include rating and reviews count
        rating: row.rating ? Number(row.rating) : null,
        reviewsCount: row.reviews_count ? Number(row.reviews_count) : 0,
        // Include variants count (not the full variations array for performance)
        variantsCount: row.variants_count ? Number(row.variants_count) : 0,
      }));

      console.log(`[ProductModel] Fetched ${total} products (${products.length} in current page)`);

      return {
        success: true,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        products: products.map(p => ({
          ...p,
          categoryName: (p as any).categoryName || null,
        })),
      };
    } catch (error) {
      console.error('[ProductModel] findAll error:', error);
      throw error;
    }
  }

  /**
   * Parse date string, handling invalid dates gracefully
   */
  private static parseDate(dateValue: any): Date | null {
    if (!dateValue) return null;
    
    try {
      // If it's already a Date object
      if (dateValue instanceof Date) {
        // Check if it's a valid date
        if (isNaN(dateValue.getTime())) {
          return null;
        }
        return dateValue;
      }

      // If it's a string, try to parse it
      if (typeof dateValue === 'string') {
        // Handle MySQL zero dates (0000-00-00 00:00:00)
        if (dateValue.startsWith('0000-00-00') || dateValue.includes('0000-00-00')) {
          return null;
        }
        
        const parsed = new Date(dateValue);
        if (isNaN(parsed.getTime())) {
          return null;
        }
        return parsed;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Find product by ID
   * Returns data in the same format as PHP backend (v3.0.0 ProductController)
   */
  static async findById(id: number): Promise<Product | null> {
    try {
      // Use raw SQL query to avoid Prisma schema validation issues (e.g., syncPriority enum mismatch)
      const query = `SELECT 
        p.id, p.source, p.source_product_id, p.product_code, p.product_name, p.display_name,
        p.description, p.display_description, p.original_name, p.original_description,
        p.model, p.brand, p.provider_brand_id, p.product_qty_left, p.product_cost, p.product_price,
        p.has_option, p.boolean_percent_discount, p.sales_discount, p.product_condition,
        p.free_shipping, p.provider_price, p.flat_rate, p.multi_shipping, p.shipping_cost,
        p.show_on_website, p.product_section, p.category_id, p.main_image, p.attachment_counter,
        p.locked_by, p.created_by, p.updated_by,
        CAST(p.created_at AS CHAR) as created_at,
        CAST(p.updated_at AS CHAR) as updated_at,
        p.r_store_id, p.r_flash_id, p.slug, p.currency_id, p.express_delivery, p.sync_id,
        p.product_status, p.out_of_stock, p.view_count, p.images_json, p.video_url,
        p.shop_login_id, p.shop_url, p.shop_company_name, p.shop_is_super_factory,
        p.shop_repurchase_rate, p.sales_count, p.buyer_count, p.product_url,
        p.origin_price, p.show_price, p.sale_price, p.quantity_begin, p.is_complete,
        p.is_syncing, p.is_new,
        CAST(p.discovered_at AS CHAR) as discovered_at,
        CAST(p.last_synced_at AS CHAR) as last_synced_at,
        CAST(p.next_sync_at AS CHAR) as next_sync_at,
        p.sync_priority, p.sync_failures, p.last_sync_error, p.content_hash, p.price_hash,
        CAST(p.last_viewed_at AS CHAR) as last_viewed_at,
        p.old_discount, p.karat,
        c.category_name,
        pi.title_zh, pi.title_en, pi.description_zh, pi.description_en,
        pi.video_url as info_video_url, pi.service_tags, pi.product_props,
        pi.images as info_images, pi.origin_price as info_origin_price,
        (SELECT AVG(ur.rating) FROM users_reviews ur WHERE ur.r_product_id = p.id) as rating,
        (SELECT COUNT(ur.id) FROM users_reviews ur WHERE ur.r_product_id = p.id) as reviews_count
      FROM product p
      LEFT JOIN category c ON p.category_id = c.id
      LEFT JOIN product_1688_info pi ON p.id = pi.product_id
      WHERE p.id = ? LIMIT 1`;
      
      const rawProducts = await prisma.$queryRawUnsafe<any[]>(query, id);
      
      if (!rawProducts || rawProducts.length === 0) {
        return null;
      }
      
      const row = rawProducts[0];
      
      // Get currency info for conversion
      const currencyId = Number(row.currency_id || 6);
      const currencySymbol = getCurrencySymbol();
      
      // Convert product price
      const originPrice = row.info_origin_price ? Number(row.info_origin_price) : (row.product_price ? Number(row.product_price) : null);
      const convertedPrice = await convertPrice(originPrice, currencyId);
      
      // ==========================================
      // NEW: Get variant options and variations (matching PHP backend structure)
      // ==========================================
      
      // Get product options (Color, Size, etc.)
      const optionsQuery = `SELECT * FROM product_options WHERE product_id = ? ORDER BY order_number ASC, id ASC`;
      const optionsResult = await prisma.$queryRawUnsafe<any[]>(optionsQuery, id);
      
      // Format options with their values
      const options: ProductOption[] = [];
      for (const opt of optionsResult) {
        // Get values for this option
        const valuesQuery = `SELECT * FROM product_options_values WHERE r_product_option_id = ? ORDER BY id ASC`;
        const valuesResult = await prisma.$queryRawUnsafe<any[]>(valuesQuery, opt.id);
        
        const formattedValues: ProductOptionValue[] = valuesResult.map((v: any) => ({
          id: Number(v.id),
          r_product_option_id: Number(v.r_product_option_id),
          name: v.name || '',
          vid: v.vid || null,
          is_color: Number(v.is_color || 0),
          color: v.color || null,
          image_url: v.image_url || null,
        }));
        
        options.push({
          id: Number(opt.id),
          pid: opt.pid || null,
          name: opt.type || '',
          is_color: Number(opt.is_color || 0),
          values: formattedValues,
        });
      }
      
      // Get variations from the NEW product_variation table
      const variationsQuery = `SELECT * FROM product_variation WHERE product_id = ? ORDER BY default_option DESC, id ASC`;
      const variationsResult = await prisma.$queryRawUnsafe<any[]>(variationsQuery, id);
      
      // Format variations with selected options (matching PHP backend)
      const variationsNew: ProductVariation[] = await Promise.all(
        variationsResult.map(async (v: any) => {
          // Convert variation price
          const variantPrice = await convertPrice(v.price ? Number(v.price) : null, currencyId);
          
          // Get selected options for this variation
          const variationValuesQuery = `
            SELECT pvv.*, pov.name as value_name, pov.image_url
            FROM product_variation_values pvv
            LEFT JOIN product_options_values pov ON pvv.value_id = pov.id
            WHERE pvv.variation_id = ?
          `;
          const variationValuesResult = await prisma.$queryRawUnsafe<any[]>(variationValuesQuery, v.id);
          
          const selectedOptions: SelectedOption[] = variationValuesResult.map((vv: any) => ({
            r_product_option_id: Number(vv.option_id),
            option_id: Number(vv.option_id),
            value_id: Number(vv.value_id),
            value_name: vv.value_name || '',
            image_url: vv.image_url || null,
          }));
          
          return {
            id: Number(v.id),
            sku_id: v.sku_id || null,
            variation_name: v.variation_name || null,
            props_ids: v.props_ids || null,
            price: variantPrice,
            currency_symbol: currencySymbol,
            variation_image: v.variation_image || null,
            status: v.status || 'active',
            selected_options: selectedOptions,
            cart_quantity: 0, // TODO: Get from cart if user is authenticated
          };
        })
      );
      
      // ==========================================
      // LEGACY: Also get old product_variant data for backward compatibility
      // ==========================================
      const legacyVariantsQuery = `SELECT * FROM product_variant WHERE product_id = ? ORDER BY sort_order ASC, id ASC`;
      const legacyVariantsResult = await prisma.$queryRawUnsafe<any[]>(legacyVariantsQuery, id);
      
      // Convert legacy variant prices
      const variations: ProductVariant[] = await Promise.all(
        legacyVariantsResult.map(async (v: any) => {
          const variantOriginPrice = v.origin_price ? Number(v.origin_price) : null;
          const variantConvertedPrice = await convertPrice(variantOriginPrice, currencyId);
          
          return {
            id: Number(v.id),
            productId: Number(v.product_id),
            skuId: v.sku_id || null,
            variantName: v.variant_name || null,
            propsIds: v.props_ids || null,
            propsNames: v.props_names || null,
            variantImage: v.variant_image || null,
            salePrice: v.sale_price ? Number(v.sale_price) : null,
            originPrice: variantOriginPrice,
            discountPrice: v.discount_price ? Number(v.discount_price) : null,
            stock: Number(v.stock || 0),
            sortOrder: Number(v.sort_order || 0),
            convertedPrice: variantConvertedPrice,
            currencySymbol: currencySymbol,
          };
        })
      );
      
      // Transform raw result to match Product interface
      return {
        id: Number(row.id),
        source: row.source || null,
        sourceProductId: row.source_product_id || null,
        productCode: row.product_code || '',
        productName: row.product_name || '',
        displayName: row.display_name || null,
        description: row.description || null,
        displayDescription: row.display_description || null,
        originalName: row.original_name || null,
        originalDescription: row.original_description || null,
        model: row.model || null,
        brand: row.brand ? Number(row.brand) : null,
        providerBrandId: row.provider_brand_id ? Number(row.provider_brand_id) : null,
        productQtyLeft: Number(row.product_qty_left || 0),
        productCost: Number(row.product_cost || 0),
        productPrice: Number(row.product_price || 0),
        hasOption: Number(row.has_option || 0),
        booleanPercentDiscount: Number(row.boolean_percent_discount || 0),
        salesDiscount: row.sales_discount ? Number(row.sales_discount) : null,
        productCondition: row.product_condition ? Number(row.product_condition) : null,
        freeShipping: Number(row.free_shipping || 0),
        providerPrice: row.provider_price ? Number(row.provider_price) : null,
        flatRate: Number(row.flat_rate || 0),
        multiShipping: Number(row.multi_shipping || 0),
        shippingCost: row.shipping_cost ? Number(row.shipping_cost) : null,
        showOnWebsite: Number(row.show_on_website ?? 1),
        productSection: row.product_section ? Number(row.product_section) : null,
        categoryId: row.category_id ? Number(row.category_id) : null,
        mainImage: row.main_image || null,
        attachmentCounter: row.attachment_counter ? Number(row.attachment_counter) : null,
        lockedBy: row.locked_by ? Number(row.locked_by) : null,
        createdBy: Number(row.created_by || 0),
        updatedBy: row.updated_by ? Number(row.updated_by) : null,
        createdAt: this.parseDate(row.created_at),
        updatedAt: this.parseDate(row.updated_at),
        rStoreId: row.r_store_id ? Number(row.r_store_id) : null,
        rFlashId: row.r_flash_id ? Number(row.r_flash_id) : null,
        slug: row.slug || '',
        currencyId: Number(row.currency_id || 1),
        expressDelivery: Number(row.express_delivery || 0),
        syncId: row.sync_id || null,
        productStatus: Number(row.product_status || 32),
        outOfStock: Number(row.out_of_stock || 0),
        viewCount: Number(row.view_count || 0),
        imagesJson: row.images_json || null,
        videoUrl: row.video_url || null,
        shopLoginId: row.shop_login_id || null,
        shopUrl: row.shop_url || null,
        shopCompanyName: row.shop_company_name || null,
        shopIsSuperFactory: row.shop_is_super_factory ? Number(row.shop_is_super_factory) : null,
        shopRepurchaseRate: row.shop_repurchase_rate || null,
        salesCount: Number(row.sales_count || 0),
        buyerCount: Number(row.buyer_count || 0),
        productUrl: row.product_url || null,
        originPrice: row.origin_price ? Number(row.origin_price) : null,
        showPrice: row.show_price ? Number(row.show_price) : null,
        salePrice: row.sale_price ? Number(row.sale_price) : null,
        quantityBegin: row.quantity_begin ? Number(row.quantity_begin) : null,
        isComplete: Number(row.is_complete || 0),
        isSyncing: Number(row.is_syncing || 0),
        isNew: Number(row.is_new || 0),
        discoveredAt: this.parseDate(row.discovered_at),
        lastSyncedAt: this.parseDate(row.last_synced_at),
        nextSyncAt: this.parseDate(row.next_sync_at),
        syncPriority: row.sync_priority || 'normal',
        syncFailures: Number(row.sync_failures || 0),
        lastSyncError: row.last_sync_error || null,
        contentHash: row.content_hash || null,
        priceHash: row.price_hash || null,
        lastViewedAt: this.parseDate(row.last_viewed_at),
        oldDiscount: row.old_discount ? Number(row.old_discount) : null,
        karat: row.karat ? Number(row.karat) : null,
        // Include category_name from join
        categoryName: row.category_name || null,
        // Include fields from product_1688_info
        titleZh: row.title_zh || null,
        titleEn: row.title_en || null,
        descriptionZh: row.description_zh || null,
        descriptionEn: row.description_en || null,
        infoVideoUrl: row.info_video_url || null,
        serviceTags: row.service_tags || null,
        productProps: row.product_props || null,
        images: row.info_images || null,
        infoOriginPrice: row.info_origin_price ? Number(row.info_origin_price) : null,
        // Include rating and reviews count
        rating: row.rating ? Number(row.rating) : null,
        reviewsCount: row.reviews_count ? Number(row.reviews_count) : 0,
        // Include converted price and currency
        convertedPrice,
        currencySymbol,
        // LEGACY: Include old variations (for backward compatibility)
        variations,
        // NEW: Include options and new variations (matching PHP backend)
        options,
        variationsNew,
      } as any;
    } catch (error) {
      console.error('ProductModel.findById error:', error);
      throw error;
    }
  }

  /**
   * Create a new product
   */
  static async create(data: CreateProductData): Promise<ProductResponse> {
    try {
      const product = await (prisma as any).product.create({
        data: {
          productCode: data.product_code,
          productName: data.product_name,
          description: data.description || null,
          model: data.model || null,
          brand: data.brand || null,
          productQtyLeft: data.product_qty_left,
          productCost: data.product_cost,
          productPrice: data.product_price,
          hasOption: data.has_option || 0,
          booleanPercentDiscount: data.boolean_percent_discount || 0,
          salesDiscount: data.sales_discount || null,
          productCondition: data.product_condition || null,
          freeShipping: data.free_shipping || 0,
          providerPrice: data.provider_price || null,
          flatRate: data.flat_rate || 0,
          multiShipping: data.multi_shipping || 0,
          shippingCost: data.shipping_cost || null,
          showOnWebsite: data.show_on_website ?? 1,
          productSection: data.product_section || null,
          mainImage: data.main_image || null,
          rStoreId: data.r_store_id || null,
          rFlashId: data.r_flash_id || null,
          slug: data.slug,
          currencyId: data.currency_id,
          expressDelivery: data.express_delivery || 0,
          productStatus: data.product_status || 32,
          outOfStock: data.out_of_stock || 0,
          createdBy: 1, // TODO: Get from auth context
        },
      });

      return {
        success: true,
        product,
        message: 'Product created successfully',
      };
    } catch (error) {
      console.error('ProductModel.create error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create product',
      };
    }
  }

  /**
   * Update product
   */
  static async update(id: number, data: Partial<CreateProductData>): Promise<ProductResponse> {
    try {
      const updateData: any = {};

      if (data.product_code !== undefined) updateData.productCode = data.product_code;
      if (data.product_name !== undefined) updateData.productName = data.product_name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.model !== undefined) updateData.model = data.model;
      if (data.brand !== undefined) updateData.brand = data.brand;
      if (data.product_qty_left !== undefined) updateData.productQtyLeft = data.product_qty_left;
      if (data.product_cost !== undefined) updateData.productCost = data.product_cost;
      if (data.product_price !== undefined) updateData.productPrice = data.product_price;
      if (data.has_option !== undefined) updateData.hasOption = data.has_option;
      if (data.boolean_percent_discount !== undefined) updateData.booleanPercentDiscount = data.boolean_percent_discount;
      if (data.sales_discount !== undefined) updateData.salesDiscount = data.sales_discount;
      if (data.product_condition !== undefined) updateData.productCondition = data.product_condition;
      if (data.free_shipping !== undefined) updateData.freeShipping = data.free_shipping;
      if (data.provider_price !== undefined) updateData.providerPrice = data.provider_price;
      if (data.flat_rate !== undefined) updateData.flatRate = data.flat_rate;
      if (data.multi_shipping !== undefined) updateData.multiShipping = data.multi_shipping;
      if (data.shipping_cost !== undefined) updateData.shippingCost = data.shipping_cost;
      if (data.show_on_website !== undefined) updateData.showOnWebsite = data.show_on_website;
      if (data.product_section !== undefined) updateData.productSection = data.product_section;
      if (data.main_image !== undefined) updateData.mainImage = data.main_image;
      if (data.r_store_id !== undefined) updateData.rStoreId = data.r_store_id;
      if (data.r_flash_id !== undefined) updateData.rFlashId = data.r_flash_id;
      if (data.slug !== undefined) updateData.slug = data.slug;
      if (data.currency_id !== undefined) updateData.currencyId = data.currency_id;
      if (data.express_delivery !== undefined) updateData.expressDelivery = data.express_delivery;
      if (data.product_status !== undefined) updateData.productStatus = data.product_status;
      if (data.out_of_stock !== undefined) updateData.outOfStock = data.out_of_stock;

      const product = await (prisma as any).product.update({
        where: { id },
        data: updateData,
      });

      return {
        success: true,
        product,
        message: 'Product updated successfully',
      };
    } catch (error) {
      console.error('ProductModel.update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update product',
      };
    }
  }

  /**
   * Delete product
   */
  static async delete(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Use raw SQL to avoid Prisma type validation issues (e.g., syncPriority enum mismatch)
      const deleteResult = await prisma.$executeRawUnsafe(
        `DELETE FROM product WHERE id = ?`,
        id
      );

      // Check if any row was actually deleted
      if (deleteResult === 0) {
        return { success: false, error: 'Product not found or already deleted' };
      }

      return { success: true, message: 'Product deleted successfully' };
    } catch (error) {
      console.error('ProductModel.delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete product',
      };
    }
  }

  /**
   * Bulk delete products
   */
  static async bulkDelete(ids: number[]): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (!ids || ids.length === 0) {
        return { success: false, error: 'No product IDs provided' };
      }

      // Use raw SQL to avoid Prisma type validation issues (e.g., syncPriority enum mismatch)
      const placeholders = ids.map(() => '?').join(',');
      await prisma.$executeRawUnsafe(
        `DELETE FROM product WHERE id IN (${placeholders})`,
        ...ids
      );

      return { success: true, message: 'Products deleted successfully' };
    } catch (error) {
      console.error('ProductModel.bulkDelete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete products',
      };
    }
  }
}
