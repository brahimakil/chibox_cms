import { prisma } from '@/lib/db';

// Category interface matching Prisma schema
// Note: After running npx prisma generate, you can use Prisma types directly
export interface Category {
  id: number;
  showInNavbar: number;
  slug: string;
  categoryName: string;
  createdAt: Date | null; // Can be null if invalid date in DB
  updatedAt: Date | null; // Can be null if invalid date in DB
  parent: number | null;
  orderNumber: number | null;
  createdBy: number | null;
  mainImage: string | null;
  additionalImages?: string[]; // Array of additional image URLs
  attachmentCounter: number | null;
  lockedBy: number | null;
  updatedBy: number | null;
  rStoreId: number | null;
  productCount: number;
  display: number;
  cartBtn: number | null;
  rGridId: number | null;
  type: number;
  syncId: number | null;
  source: string;
  sourceCategoryId: string | null;
  categoryNameZh: string | null;
  categoryNameEn: string | null;
  level: number;
  hasChildren: number;
  highestProductId: string | null;
  lowestProductId: string | null;
  fullySynced: number;
  lastSyncDirection: string;
  lastProductSync: Date | null;
  lastCategorySync: Date | null;
  newProductsFound: number;
  totalProductsApi: number;
  productsInDb: number;
  syncEnabled: number;
  syncPriority: string;
  fullPath: string | null;
  childSynced: number;
  lastChildCheck: Date | null;
}

export interface CreateCategoryData {
  category_name: string;
  slug: string;
  type: number;
  parent?: number | null;
  show_in_navbar?: number;
  display?: number;
  cart_btn?: number;
  r_store_id?: number | null;
  main_image?: string | null;
  order_number?: number | null;
}

export interface CategoryListResponse {
  success: boolean;
  total: number;
  categories: Category[];
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface CategoryResponse {
  success: boolean;
  category?: Category;
  message?: string;
  error?: string;
}

export class CategoryModel {
  /**
   * Fetch all categories with optional pagination
   */
  static async findAll(params?: {
    type?: number; // 0 for main categories, 1 for subcategories
    store_id?: number;
    source?: string;
    page?: number; // Page number (1-based)
    limit?: number; // Items per page
    search?: string; // Search in category_name
    display?: number; // 1 for active, 0 for hidden
    // Column filters
    id?: string; // Filter by ID (exact or range)
    category_name?: string; // Filter by category name (exact match or LIKE)
    parent?: number; // Filter by parent ID
    product_count?: string; // Filter by product count (exact or range)
    show_in_navbar?: number; // Filter by show in navbar (0 or 1)
    order_number?: string; // Filter by order number (exact or range)
    sort?: string[]; // Sorting parameters (e.g., ["id:asc", "category_name:desc"])
  }): Promise<CategoryListResponse> {
    try {
      // Build WHERE conditions using MySQL placeholders (?)
      const conditions: string[] = [];
      const values: any[] = [];

      if (params?.type !== undefined) {
        conditions.push(`type = ?`);
        values.push(params.type);
      }

      if (params?.store_id) {
        conditions.push(`r_store_id = ?`);
        values.push(params.store_id);
      }

      if (params?.source) {
        conditions.push(`source = ?`);
        values.push(params.source);
      }

      if (params?.display !== undefined) {
        conditions.push(`display = ?`);
        values.push(params.display);
      }

      if (params?.search) {
        // Search in category_name (case-insensitive)
        conditions.push(`LOWER(category_name) LIKE LOWER(?)`);
        const searchPattern = `%${params.search}%`;
        values.push(searchPattern);
      }

      // Column filters
      if (params?.id) {
        // Support exact match or range (e.g., "5" or "5-10")
        if (params.id.includes('-')) {
          const [min, max] = params.id.split('-').map(v => v.trim());
          if (min && max) {
            conditions.push(`id >= ? AND id <= ?`);
            values.push(parseInt(min), parseInt(max));
          } else if (min) {
            conditions.push(`id >= ?`);
            values.push(parseInt(min));
          }
        } else {
          conditions.push(`id = ?`);
          values.push(parseInt(params.id));
        }
      }

      if (params?.category_name) {
        // Filter by category name (LIKE search)
        conditions.push(`LOWER(category_name) LIKE LOWER(?)`);
        const namePattern = `%${params.category_name}%`;
        values.push(namePattern);
      }

      if (params?.parent !== undefined) {
        conditions.push(`parent = ?`);
        values.push(params.parent);
      }

      if (params?.product_count) {
        // Support exact match or range
        if (params.product_count.includes('-')) {
          const [min, max] = params.product_count.split('-').map(v => v.trim());
          if (min && max) {
            conditions.push(`product_count >= ? AND product_count <= ?`);
            values.push(parseInt(min), parseInt(max));
          } else if (min) {
            conditions.push(`product_count >= ?`);
            values.push(parseInt(min));
          }
        } else {
          conditions.push(`product_count = ?`);
          values.push(parseInt(params.product_count));
        }
      }

      if (params?.show_in_navbar !== undefined) {
        conditions.push(`show_in_navbar = ?`);
        values.push(params.show_in_navbar);
      }

      if (params?.order_number) {
        // Support exact match or range
        if (params.order_number.includes('-')) {
          const [min, max] = params.order_number.split('-').map(v => v.trim());
          if (min && max) {
            conditions.push(`order_number >= ? AND order_number <= ?`);
            values.push(parseInt(min), parseInt(max));
          } else if (min) {
            conditions.push(`order_number >= ?`);
            values.push(parseInt(min));
          }
        } else {
          conditions.push(`order_number = ?`);
          values.push(parseInt(params.order_number));
        }
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM category ${whereClause}`;
      const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        countQuery,
        ...values
      );
      const total = Number(countResult[0]?.count || 0);

      // Build ORDER BY clause from sort parameters
      // Map API column names (snake_case) to database column names
      const columnMap: Record<string, string> = {
        'id': 'id',
        'category_name': 'category_name',
        'parent': 'parent',
        'product_count': 'product_count',
        'show_in_navbar': 'show_in_navbar',
        'order_number': 'order_number',
        'display': 'display',
        'type': 'type',
        'level': 'level',
        'created_at': 'created_at',
        'updated_at': 'updated_at',
      };

      let orderByClause = '';
      if (params?.sort && params.sort.length > 0) {
        const orderByParts: string[] = [];
        params.sort.forEach((sortParam) => {
          const [column, direction] = sortParam.split(':');
          const dbColumn = columnMap[column] || column;
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
        orderByClause = 'ORDER BY level ASC, order_number ASC';
      }

      // Build ORDER BY and LIMIT
      // Cast date fields to CHAR to bypass Prisma's date validation
      let query = `SELECT 
        id, show_in_navbar, slug, category_name,
        CAST(created_at AS CHAR) as created_at,
        CAST(updated_at AS CHAR) as updated_at,
        parent, order_number, created_by, main_image, attachment_counter,
        locked_by, updated_by, r_store_id, product_count, display, cart_btn,
        r_grid_id, type, sync_id, source, source_category_id, category_name_zh,
        category_name_en, level, has_children, highest_product_id, lowest_product_id,
        fully_synced, last_sync_direction,
        CAST(last_product_sync AS CHAR) as last_product_sync,
        CAST(last_category_sync AS CHAR) as last_category_sync,
        new_products_found, total_products_api, products_in_db, sync_enabled,
        sync_priority, full_path, child_synced,
        CAST(last_child_check AS CHAR) as last_child_check
      FROM category ${whereClause} ${orderByClause}`;
      const queryValues = [...values];
      
      if (params?.page && params?.limit) {
        const offset = (params.page - 1) * params.limit;
        query += ` LIMIT ? OFFSET ?`;
        queryValues.push(params.limit, offset);
      }

      // Use raw query to handle invalid dates gracefully
      const rawCategories = await prisma.$queryRawUnsafe<any[]>(query, ...queryValues);

      // Transform raw results to match Category interface, handling invalid dates
      const categories: Category[] = rawCategories.map((row: any) => ({
        id: Number(row.id),
        showInNavbar: Number(row.show_in_navbar || 0),
        slug: row.slug || '',
        categoryName: row.category_name || '',
        createdAt: this.parseDate(row.created_at),
        updatedAt: this.parseDate(row.updated_at),
        parent: row.parent ? Number(row.parent) : null,
        orderNumber: row.order_number ? Number(row.order_number) : null,
        createdBy: row.created_by ? Number(row.created_by) : null,
        mainImage: row.main_image || null,
        attachmentCounter: row.attachment_counter ? Number(row.attachment_counter) : null,
        lockedBy: row.locked_by ? Number(row.locked_by) : null,
        updatedBy: row.updated_by ? Number(row.updated_by) : null,
        rStoreId: row.r_store_id ? Number(row.r_store_id) : null,
        productCount: Number(row.product_count || 0),
        display: Number(row.display || 1),
        cartBtn: row.cart_btn ? Number(row.cart_btn) : null,
        rGridId: row.r_grid_id ? Number(row.r_grid_id) : null,
        type: Number(row.type || 0),
        syncId: row.sync_id ? Number(row.sync_id) : null,
        source: row.source || '1688',
        sourceCategoryId: row.source_category_id || null,
        categoryNameZh: row.category_name_zh || null,
        categoryNameEn: row.category_name_en || null,
        level: Number(row.level || 0),
        hasChildren: Number(row.has_children || 0),
        highestProductId: row.highest_product_id || null,
        lowestProductId: row.lowest_product_id || null,
        fullySynced: Number(row.fully_synced || 0),
        lastSyncDirection: row.last_sync_direction || 'none',
        lastProductSync: this.parseDate(row.last_product_sync),
        lastCategorySync: this.parseDate(row.last_category_sync),
        newProductsFound: Number(row.new_products_found || 0),
        totalProductsApi: Number(row.total_products_api || 0),
        productsInDb: Number(row.products_in_db || 0),
        syncEnabled: Number(row.sync_enabled || 0),
        syncPriority: row.sync_priority || 'normal',
        fullPath: row.full_path || null,
        childSynced: Number(row.child_synced || 0),
        lastChildCheck: this.parseDate(row.last_child_check),
      }));

      console.log(`[CategoryModel] Fetched ${total} categories (${categories.length} in current page)`);

      if (params?.page && params?.limit) {
        return {
          success: true,
          total,
          page: params.page,
          limit: params.limit,
          totalPages: Math.ceil(total / params.limit),
          categories,
        };
      }

      return {
        success: true,
        total,
        categories,
      };
    } catch (error) {
      console.error('[CategoryModel] findAll error:', error);
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
   * Fetch category tree structure
   */
  static async findTree(params?: {
    source?: string;
  }): Promise<{ success: boolean; total: number; tree: Category[] }> {
    try {
      const where: any = {};
      if (params?.source) {
        where.source = params.source;
      }

      const categories = await (prisma as any).category.findMany({
        where,
        select: {
          id: true,
          categoryName: true,
          parent: true,
          hasChildren: true,
          level: true,
        },
        orderBy: [
          { level: 'asc' },
          { orderNumber: 'asc' },
        ],
      });

      // Build tree structure
      const tree = this.buildTree(categories);

      return {
        success: true,
        total: categories.length,
        tree,
      };
    } catch (error) {
      console.error('CategoryModel.findTree error:', error);
      throw error;
    }
  }

  /**
   * Build tree structure from flat array
   */
  private static buildTree(categories: any[]): Category[] {
    const indexed: { [key: number]: any } = {};
    
    // Create indexed map
    categories.forEach((category) => {
      indexed[category.id] = { ...category, children: [] };
    });

    const tree: Category[] = [];
    
    // Build tree
    Object.values(indexed).forEach((category: any) => {
      const parentId = category.parent;
      if (parentId !== null && indexed[parentId]) {
        indexed[parentId].children.push(category);
      } else {
        tree.push(category);
      }
    });

    return tree;
  }

  /**
   * Find category by ID
   */
  static async findById(id: number): Promise<Category | null> {
    try {
      const rawCategories = await prisma.$queryRawUnsafe<any[]>(
        `SELECT 
          id, show_in_navbar, slug, category_name,
          CAST(created_at AS CHAR) as created_at,
          CAST(updated_at AS CHAR) as updated_at,
          parent, order_number, created_by, main_image, attachment_counter,
          locked_by, updated_by, r_store_id, product_count, display, cart_btn,
          r_grid_id, type, sync_id, source, source_category_id, category_name_zh,
          category_name_en, level, has_children, highest_product_id, lowest_product_id,
          fully_synced, last_sync_direction,
          CAST(last_product_sync AS CHAR) as last_product_sync,
          CAST(last_category_sync AS CHAR) as last_category_sync,
          new_products_found, total_products_api, products_in_db, sync_enabled,
          sync_priority, full_path, child_synced,
          CAST(last_child_check AS CHAR) as last_child_check
        FROM category WHERE id = ? LIMIT 1`,
        id
      );

      if (!rawCategories || rawCategories.length === 0) {
        return null;
      }

      const row = rawCategories[0];
      
      // Fetch additional images from ag_attachment table (type = 2)
      let additionalImages: string[] = [];
      try {
        const attachments = await prisma.$queryRawUnsafe<any[]>(
          `SELECT file_path 
           FROM ag_attachment 
           WHERE table_name = '137' AND row_id = ? AND type = 2 
           ORDER BY id ASC`,
          id
        );
        additionalImages = attachments.map((att: any) => att.file_path || '').filter(Boolean);
      } catch (attachmentError) {
        console.error('Error fetching additional images:', attachmentError);
        // Continue without additional images if query fails
      }

      return {
        id: Number(row.id),
        showInNavbar: Number(row.show_in_navbar || 0),
        slug: row.slug || '',
        categoryName: row.category_name || '',
        createdAt: this.parseDate(row.created_at),
        updatedAt: this.parseDate(row.updated_at),
        parent: row.parent ? Number(row.parent) : null,
        orderNumber: row.order_number ? Number(row.order_number) : null,
        createdBy: row.created_by ? Number(row.created_by) : null,
        mainImage: row.main_image || null,
        additionalImages: additionalImages.length > 0 ? additionalImages : undefined,
        attachmentCounter: row.attachment_counter ? Number(row.attachment_counter) : null,
        lockedBy: row.locked_by ? Number(row.locked_by) : null,
        updatedBy: row.updated_by ? Number(row.updated_by) : null,
        rStoreId: row.r_store_id ? Number(row.r_store_id) : null,
        productCount: Number(row.product_count || 0),
        display: Number(row.display || 1),
        cartBtn: row.cart_btn ? Number(row.cart_btn) : null,
        rGridId: row.r_grid_id ? Number(row.r_grid_id) : null,
        type: Number(row.type || 0),
        syncId: row.sync_id ? Number(row.sync_id) : null,
        source: row.source || '1688',
        sourceCategoryId: row.source_category_id || null,
        categoryNameZh: row.category_name_zh || null,
        categoryNameEn: row.category_name_en || null,
        level: Number(row.level || 0),
        hasChildren: Number(row.has_children || 0),
        highestProductId: row.highest_product_id || null,
        lowestProductId: row.lowest_product_id || null,
        fullySynced: Number(row.fully_synced || 0),
        lastSyncDirection: row.last_sync_direction || 'none',
        lastProductSync: this.parseDate(row.last_product_sync),
        lastCategorySync: this.parseDate(row.last_category_sync),
        newProductsFound: Number(row.new_products_found || 0),
        totalProductsApi: Number(row.total_products_api || 0),
        productsInDb: Number(row.products_in_db || 0),
        syncEnabled: Number(row.sync_enabled || 0),
        syncPriority: row.sync_priority || 'normal',
        fullPath: row.full_path || null,
        childSynced: Number(row.child_synced || 0),
        lastChildCheck: this.parseDate(row.last_child_check),
      };
    } catch (error) {
      console.error('CategoryModel.findById error:', error);
      throw error;
    }
  }

  /**
   * Create a new category
   */
  static async create(data: CreateCategoryData): Promise<CategoryResponse> {
    try {
      // Use raw SQL to ensure proper column name mapping and avoid Prisma field mapping issues
      // Note: last_sync_direction and sync_priority are omitted to let database use DEFAULT values
      // (matching PHP backend behavior which doesn't set these fields on create)
      const insertQuery = `
        INSERT INTO category (
          category_name, slug, type, parent, show_in_navbar, display, cart_btn,
          r_store_id, main_image, order_number, created_by,
          product_count, source, level, has_children, fully_synced,
          new_products_found, total_products_api,
          products_in_db, sync_enabled, child_synced,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?,
          ?, ?, ?,
          NOW(), NOW()
        )
      `;

      const values = [
        data.category_name,
        data.slug,
        data.type,
        data.parent ?? null,
        data.show_in_navbar ?? 0,
        data.display ?? 1,
        data.cart_btn ?? 1,
        data.r_store_id ?? null,
        data.main_image ?? null,
        data.order_number ?? null,
        1, // created_by - TODO: Get from auth context
        // Required fields with defaults
        0, // product_count
        '1688', // source
        0, // level
        0, // has_children
        0, // fully_synced
        0, // new_products_found
        0, // total_products_api
        0, // products_in_db
        0, // sync_enabled
        0, // child_synced
      ];

      console.log('[CategoryModel.create] Inserting category (letting DB set defaults for last_sync_direction and sync_priority)');

      // Execute raw SQL insert
      await prisma.$executeRawUnsafe(insertQuery, ...values);

      // Get the last inserted ID
      const idResult = await prisma.$queryRawUnsafe<Array<{ id: bigint }>>(
        `SELECT LAST_INSERT_ID() as id`
      );

      if (!idResult || idResult.length === 0 || !idResult[0].id) {
        return {
          success: false,
          error: 'Failed to retrieve created category ID',
        };
      }

      const categoryId = Number(idResult[0].id);
      const category = await this.findById(categoryId);

      if (!category) {
        return {
          success: false,
          error: 'Failed to retrieve created category',
        };
      }

      return {
        success: true,
        category: category!,
        message: 'Category created successfully',
      };
    } catch (error) {
      console.error('CategoryModel.create error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create category',
      };
    }
  }

  /**
   * Update category
   */
  static async update(id: number, data: Partial<CreateCategoryData>): Promise<CategoryResponse> {
    try {
      // Build UPDATE query using raw SQL to avoid Prisma field mapping issues
      const updateFields: string[] = [];
      const values: any[] = [];

      if (data.category_name !== undefined) {
        updateFields.push('category_name = ?');
        values.push(data.category_name);
      }
      if (data.slug !== undefined) {
        updateFields.push('slug = ?');
        values.push(data.slug);
      }
      if (data.type !== undefined) {
        updateFields.push('type = ?');
        values.push(data.type);
      }
      if (data.parent !== undefined) {
        updateFields.push('parent = ?');
        values.push(data.parent ?? null);
      }
      if (data.show_in_navbar !== undefined) {
        updateFields.push('show_in_navbar = ?');
        values.push(data.show_in_navbar);
      }
      if (data.display !== undefined) {
        updateFields.push('display = ?');
        values.push(data.display);
      }
      if (data.cart_btn !== undefined) {
        updateFields.push('cart_btn = ?');
        values.push(data.cart_btn);
      }
      if (data.r_store_id !== undefined) {
        updateFields.push('r_store_id = ?');
        values.push(data.r_store_id ?? null);
      }
      if (data.main_image !== undefined) {
        updateFields.push('main_image = ?');
        values.push(data.main_image ?? null);
      }
      if (data.order_number !== undefined) {
        updateFields.push('order_number = ?');
        values.push(data.order_number ?? null);
      }

      // Always update updated_at timestamp
      updateFields.push('updated_at = NOW()');

      if (updateFields.length === 0) {
        // No fields to update, just fetch and return the category
        const category = await this.findById(id);
        if (!category) {
          return {
            success: false,
            error: 'Category not found',
          };
        }
        return {
          success: true,
          category,
          message: 'Category updated successfully',
        };
      }

      // Add id to values for WHERE clause
      values.push(id);

      const updateQuery = `
        UPDATE category 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;

      await prisma.$executeRawUnsafe(updateQuery, ...values);

      // Fetch the updated category
      const category = await this.findById(id);

      if (!category) {
        return {
          success: false,
          error: 'Failed to retrieve updated category',
        };
      }

      return {
        success: true,
        category,
        message: 'Category updated successfully',
      };
    } catch (error) {
      console.error('CategoryModel.update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update category',
      };
    }
  }

  /**
   * Delete category
   */
  static async delete(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Check if category has children using raw SQL
      const childrenCheck = await prisma.$queryRawUnsafe<Array<{ has_children: number }>>(
        `SELECT has_children FROM category WHERE id = ? LIMIT 1`,
        id
      );

      if (!childrenCheck || childrenCheck.length === 0) {
        return { success: false, error: 'Category not found' };
      }

      if (childrenCheck[0].has_children === 1) {
        return { success: false, error: 'Cannot delete category with children' };
      }

      // Delete using raw SQL to avoid Prisma field mapping issues
      const deleteResult = await prisma.$executeRawUnsafe(
        `DELETE FROM category WHERE id = ?`,
        id
      );

      // Check if any row was actually deleted
      if (deleteResult === 0) {
        return { success: false, error: 'Category not found or already deleted' };
      }

      return { success: true, message: 'Category deleted successfully' };
    } catch (error) {
      console.error('CategoryModel.delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete category',
      };
    }
  }

  /**
   * Bulk delete categories
   */
  static async bulkDelete(ids: number[]): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (!ids || ids.length === 0) {
        return { success: false, error: 'No category IDs provided' };
      }

      // Check if any category has children using raw SQL
      const placeholders = ids.map(() => '?').join(',');
      const categoriesWithChildren = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
        `SELECT id FROM category WHERE id IN (${placeholders}) AND has_children = 1`,
        ...ids
      );

      if (categoriesWithChildren.length > 0) {
        return {
          success: false,
          error: `Cannot delete ${categoriesWithChildren.length} category/categories with children`,
        };
      }

      // Delete using raw SQL to avoid Prisma field mapping issues
      await prisma.$executeRawUnsafe(
        `DELETE FROM category WHERE id IN (${placeholders})`,
        ...ids
      );

      return { success: true, message: 'Categories deleted successfully' };
    } catch (error) {
      console.error('CategoryModel.bulkDelete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete categories',
      };
    }
  }
}
