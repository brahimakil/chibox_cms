import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

// Export Prisma type as our model type
export type User = Awaited<ReturnType<typeof prisma.users.findUnique>>;

export class UsersModel {
  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    return prisma.users.findFirst({
      where: {
        email: email,
      },
    });
  }

  /**
   * Find user by ID
   */
  static async findById(id: number): Promise<User | null> {
    return prisma.users.findUnique({
      where: {
        id: id,
      },
    });
  }

  /**
   * Find user by phone number
   */
  static async findByPhone(
    countryCode: string,
    phoneNumber: string,
    type: number = 3
  ): Promise<User | null> {
    return prisma.users.findFirst({
      where: {
        countryCode: countryCode,
        phoneNumber: phoneNumber,
        type: type,
      },
    });
  }

  /**
   * Create a new user
   */
  static async create(userData: {
    firstName: string;
    lastName: string;
    email?: string;
    countryCode?: string;
    phoneNumber?: string;
    password: string;
    type?: number;
    mobileToken?: string;
    webToken?: string;
    isActive?: number;
    isActivated?: number;
    showPrices?: number;
  }): Promise<User> {
    // Hash password if not already hashed
    const hashedPassword = userData.password.startsWith('$2')
      ? userData.password
      : await bcrypt.hash(userData.password, 10);

    // Generate tokens if not provided
    const mobileToken = userData.mobileToken || randomBytes(32).toString('hex');
    const webToken = userData.webToken || randomBytes(32).toString('hex');

    return prisma.users.create({
      data: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email || null,
        countryCode: userData.countryCode || null,
        phoneNumber: userData.phoneNumber || null,
        password: hashedPassword,
        type: userData.type || 3,
        mobileToken: mobileToken,
        webToken: webToken,
        isActive: userData.isActive ?? 1,
        isActivated: userData.isActivated ?? 0,
        showPrices: userData.showPrices ?? 1,
      },
    });
  }

  /**
   * Update user
   * 
   * Uses Prisma.UsersUpdateInput for type safety and prevents null values
   * from being sent to Prisma for non-nullable fields.
   * 
   * @param id - User ID to update
   * @param updates - Partial update object (can contain any fields, will be filtered)
   * @returns Updated user
   */
  static async update(
    id: number,
    updates: Record<string, unknown>
  ): Promise<User> {
    // Debug logging to help diagnose issues
    console.log(`[UsersModel.update] Updating user ${id} with fields:`, Object.keys(updates));
    
    // Build Prisma update input with strict type safety
    const updateData: Prisma.UsersUpdateInput = {};
    
    // Whitelist of allowed updatable fields with their nullability rules
    // Fields NOT in this list will be silently ignored
    const ALLOWED_FIELDS = {
      // Non-nullable fields (must have valid non-null values)
      firstName: { nullable: false },
      lastName: { nullable: false },
      isActive: { nullable: false },
      isActivated: { nullable: false },
      type: { nullable: false },
      mobileToken: { nullable: false },
      webToken: { nullable: false },
      
      // Nullable fields (can be null or have values)
      email: { nullable: true },
      countryCode: { nullable: true },
      phoneNumber: { nullable: true },
      gender: { nullable: true },
      languageId: { nullable: true },
      lastLogin: { nullable: true },
      mainImage: { nullable: true },
      attachmentCounter: { nullable: true },
      lockedBy: { nullable: true },
      createdBy: { nullable: true },
      updatedBy: { nullable: true },
      isProvider: { nullable: true },
      rStoreId: { nullable: true },
      appleIdentifier: { nullable: true },
      
      // showPrices is EXPLICITLY EXCLUDED from updates
      // To allow showPrices updates, add: showPrices: { nullable: false }
    } as const;
    
    // Process each field in the updates object
    for (const [key, value] of Object.entries(updates)) {
      // Skip undefined values (not provided)
      if (value === undefined) {
        continue;
      }
      
      // BLOCK showPrices in any form (camelCase or snake_case)
      if (key === 'showPrices' || key === 'show_prices') {
        console.warn(`[UsersModel.update] Blocked update attempt for '${key}' field`);
        continue;
      }
      
      // Skip fields not in whitelist
      const fieldConfig = ALLOWED_FIELDS[key as keyof typeof ALLOWED_FIELDS];
      if (!fieldConfig) {
        console.warn(`[UsersModel.update] Skipping unknown field: ${key}`);
        continue;
      }
      
      // Reject null values for non-nullable fields
      if (!fieldConfig.nullable && value === null) {
        console.warn(`[UsersModel.update] Rejected null value for non-nullable field: ${key}`);
        continue;
      }
      
      // Type-safe assignment to Prisma input
      // TypeScript will ensure we're using correct Prisma field names
      (updateData as Record<string, unknown>)[key] = value;
    }

    // Final validation: ensure no null values in updateData for non-nullable fields
    // This is a safety check before sending to Prisma
    const nonNullableFields = Object.entries(ALLOWED_FIELDS)
      .filter(([, config]) => !config.nullable)
      .map(([key]) => key);
    
    for (const field of nonNullableFields) {
      const value = (updateData as Record<string, unknown>)[field];
      if (value === null || value === undefined) {
        delete (updateData as Record<string, unknown>)[field];
      }
    }

    // CRITICAL: Final safety check - ensure showPrices is NEVER in updateData
    // This prevents any edge cases where it might have slipped through
    if ('showPrices' in updateData) {
      console.warn(`[UsersModel.update] Removing showPrices from updateData (should not be here)`);
      delete (updateData as Record<string, unknown>).showPrices;
    }
    if ('show_prices' in updateData) {
      console.warn(`[UsersModel.update] Removing show_prices from updateData (should not be here)`);
      delete (updateData as Record<string, unknown>).show_prices;
    }

    // Debug logging before Prisma call
    console.log(`[UsersModel.update] Final updateData keys:`, Object.keys(updateData));
    if ('showPrices' in updateData || 'show_prices' in updateData) {
      console.error(`[UsersModel.update] ERROR: showPrices still in updateData!`, updateData);
      throw new Error('showPrices field cannot be updated');
    }

    return prisma.users.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Update last login
   */
  static async updateLastLogin(id: number): Promise<void> {
    await prisma.users.update({
      where: {
        id: id,
      },
      data: {
        lastLogin: new Date(),
      },
    });
  }

  /**
   * Validate password
   */
  static async validatePassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return user !== null;
  }

  /**
   * Fetch all users with optional pagination, filtering, and order statistics
   */
  static async findAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    is_active?: number;
    is_activated?: number;
    type?: number;
    sort?: string[];
  }): Promise<{
    success: boolean;
    total: number;
    users: Array<User & {
      totalOrders?: number;
      totalSpent?: number;
    }>;
    page?: number;
    limit?: number;
    totalPages?: number;
  }> {
    try {
      const page = params?.page || 1;
      const limit = params?.limit || 50;

      // Build WHERE conditions
      const conditions: string[] = [];
      const values: any[] = [];

      if (params?.search) {
        conditions.push(`(
          LOWER(u.first_name) LIKE LOWER(?) OR 
          LOWER(u.last_name) LIKE LOWER(?) OR
          LOWER(u.email) LIKE LOWER(?) OR
          LOWER(u.phone_number) LIKE LOWER(?)
        )`);
        const searchPattern = `%${params.search}%`;
        values.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      // Column filters
      if (params?.id) {
        conditions.push(`u.id = ?`);
        values.push(parseInt(params.id));
      }

      if (params?.first_name) {
        conditions.push(`LOWER(u.first_name) LIKE LOWER(?)`);
        values.push(`%${params.first_name}%`);
      }

      if (params?.last_name) {
        conditions.push(`LOWER(u.last_name) LIKE LOWER(?)`);
        values.push(`%${params.last_name}%`);
      }

      if (params?.email) {
        conditions.push(`LOWER(u.email) LIKE LOWER(?)`);
        values.push(`%${params.email}%`);
      }

      if (params?.country_code) {
        conditions.push(`LOWER(u.country_code) LIKE LOWER(?)`);
        values.push(`%${params.country_code}%`);
      }

      if (params?.phone_number) {
        conditions.push(`LOWER(u.phone_number) LIKE LOWER(?)`);
        values.push(`%${params.phone_number}%`);
      }

      if (params?.gender) {
        conditions.push(`LOWER(u.gender) LIKE LOWER(?)`);
        values.push(`%${params.gender}%`);
      }

      if (params?.is_active !== undefined) {
        conditions.push(`u.is_active = ?`);
        values.push(params.is_active);
      }

      if (params?.is_activated !== undefined) {
        conditions.push(`u.is_activated = ?`);
        values.push(params.is_activated);
      }

      if (params?.type !== undefined) {
        conditions.push(`u.type = ?`);
        values.push(params.type);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM users u ${whereClause}`;
      const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        countQuery,
        ...values
      );
      const total = Number(countResult[0]?.count || 0);

      // Build ORDER BY clause
      const columnMap: Record<string, string> = {
        'id': 'id',
        'first_name': 'first_name',
        'last_name': 'last_name',
        'email': 'email',
        'country_code': 'country_code',
        'phone_number': 'phone_number',
        'gender': 'gender',
        'created_at': 'created_at',
        'updated_at': 'updated_at',
        'is_active': 'is_active',
        'is_activated': 'is_activated',
        'type': 'type',
      };

      // Calculate offset
      const offset = (page - 1) * limit;

      // Build ORDER BY clause
      let orderByClause = 'ORDER BY u.created_at DESC';
      if (params?.sort && params.sort.length > 0) {
        const orderByParts: string[] = [];
        params.sort.forEach((sortParam) => {
          const [column, direction] = sortParam.split(':');
          const sortDirection = direction?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
          
          // Regular columns - use table alias
          const dbColumn = columnMap[column] || column;
          if (columnMap[column] || /^[a-z_]+$/.test(column)) {
            orderByParts.push(`u.${dbColumn} ${sortDirection}`);
          }
        });
        if (orderByParts.length > 0) {
          orderByClause = `ORDER BY ${orderByParts.join(', ')}`;
        }
      }

      // Main query
      const query = `
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.country_code,
          u.phone_number,
          u.gender,
          u.is_active,
          u.created_at
        FROM users u
        ${whereClause}
        ${orderByClause}
        LIMIT ? OFFSET ?
      `;

      const allValues = [...values, limit, offset];
      const users = await prisma.$queryRawUnsafe<Array<any>>(query, ...allValues);

      // Parse dates and format response
      const formattedUsers = users.map((user: any) => {
        const formatted: any = {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          countryCode: user.country_code,
          phoneNumber: user.phone_number,
          gender: user.gender,
          isActive: user.is_active,
          createdAt: user.created_at ? new Date(user.created_at) : new Date(),
        };
        return formatted;
      });

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        total,
        users: formattedUsers,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      console.error('UsersModel.findAll error:', error);
      throw error;
    }
  }

  /**
   * Find user by ID with order statistics
   */
  static async findByIdWithStats(id: number): Promise<(User & {
    totalOrders?: number;
    totalSpent?: number;
  }) | null> {
    try {
      const query = `
        SELECT 
          u.*,
          COALESCE(COUNT(DISTINCT o.id), 0) as total_orders,
          COALESCE(SUM(o.total), 0) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.id = o.r_user_id
        WHERE u.id = ?
        GROUP BY u.id
      `;

      const result = await prisma.$queryRawUnsafe<Array<any>>(query, id);
      
      if (result.length === 0) {
        return null;
      }

      const user = result[0];
      return {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        countryCode: user.country_code,
        phoneNumber: user.phone_number,
        password: user.password,
        gender: user.gender,
        resetCode: user.reset_code,
        resetCodeDate: user.reset_code_date ? new Date(user.reset_code_date) : null,
        isActive: user.is_active,
        isActivated: user.is_activated,
        type: user.type,
        languageId: user.language_id,
        lastLogin: user.last_login ? new Date(user.last_login) : null,
        mobileToken: user.mobile_token,
        webToken: user.web_token,
        mainImage: user.main_image,
        attachmentCounter: user.attachment_counter,
        lockedBy: user.locked_by,
        createdBy: user.created_by,
        updatedBy: user.updated_by,
        createdAt: user.created_at ? new Date(user.created_at) : new Date(),
        updatedAt: user.updated_at ? new Date(user.updated_at) : new Date(),
        isProvider: user.is_provider,
        rStoreId: user.r_store_id,
        appleIdentifier: user.apple_identifier,
        showPrices: user.show_prices,
        totalOrders: Number(user.total_orders || 0),
        totalSpent: Number(user.total_spent || 0),
      } as any;
    } catch (error) {
      console.error('UsersModel.findByIdWithStats error:', error);
      throw error;
    }
  }
}

