import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

// Export Prisma type as our model type
export type AgUser = Awaited<ReturnType<typeof prisma.agUsers.findUnique>>;

export interface AgUserListResponse {
  success: boolean;
  total: number;
  users: AgUser[];
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface AgUserResponse {
  success: boolean;
  user?: AgUser;
  message?: string;
  error?: string;
}

export interface CreateAgUserData {
  user_name: string;
  first_name?: string | null;
  last_name?: string | null;
  user_password: string;
  user_role: number;
  email_address?: string | null;
  address?: string | null;
  phone_number_one?: string | null;
  country_code: string;
  gender?: 'Male' | 'Female' | 'Others' | null;
  description?: string | null;
  birth_date?: Date | null;
  main_image?: string | null;
  has_related_store?: number;
}

export class AgUsersModel {
  /**
   * Fetch all users with optional pagination, search, filtering, and sorting
   */
  static async findAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    id?: string;
    user_name?: string;
    first_name?: string;
    last_name?: string;
    email_address?: string;
    user_role?: number;
    country_code?: string;
    has_related_store?: number;
    sort?: string[];
  }): Promise<AgUserListResponse> {
    try {
      const page = params?.page || 1;
      const limit = params?.limit || 50;

      const conditions: string[] = [];
      const values: (string | number)[] = [];

      if (params?.search) {
        conditions.push(`(
          LOWER(user_name) LIKE LOWER(?)
          OR LOWER(first_name) LIKE LOWER(?)
          OR LOWER(last_name) LIKE LOWER(?)
          OR LOWER(email_address) LIKE LOWER(?)
        )`);
        const searchPattern = `%${params.search}%`;
        values.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      if (params?.id) {
        if (params.id.includes('-')) {
          const [min, max] = params.id.split('-').map(v => v.trim());
          if (min && max) {
            conditions.push(`user_id >= ? AND user_id <= ?`);
            values.push(parseInt(min), parseInt(max));
          } else if (min) {
            conditions.push(`user_id >= ?`);
            values.push(parseInt(min));
          }
        } else {
          conditions.push(`user_id = ?`);
          values.push(parseInt(params.id));
        }
      }

      if (params?.user_name) {
        conditions.push(`LOWER(user_name) LIKE LOWER(?)`);
        values.push(`%${params.user_name}%`);
      }

      if (params?.first_name) {
        conditions.push(`LOWER(first_name) LIKE LOWER(?)`);
        values.push(`%${params.first_name}%`);
      }

      if (params?.last_name) {
        conditions.push(`LOWER(last_name) LIKE LOWER(?)`);
        values.push(`%${params.last_name}%`);
      }

      if (params?.email_address) {
        conditions.push(`LOWER(email_address) LIKE LOWER(?)`);
        values.push(`%${params.email_address}%`);
      }

      if (params?.user_role !== undefined) {
        conditions.push(`user_role = ?`);
        values.push(params.user_role);
      }

      if (params?.country_code) {
        conditions.push(`country_code = ?`);
        values.push(params.country_code);
      }

      if (params?.has_related_store !== undefined) {
        conditions.push(`has_related_store = ?`);
        values.push(params.has_related_store);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM ag_users ${whereClause}`;
      const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        countQuery,
        ...values
      );
      const total = Number(countResult[0]?.count || 0);
      const totalPages = Math.ceil(total / limit);

      // Build ORDER BY clause
      let orderBy = 'ORDER BY user_id DESC';
      if (params?.sort && params.sort.length > 0) {
        const sortParts = params.sort.map(sortParam => {
          const [field, direction] = sortParam.split(':');
          const validDirection = direction?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
          // Map field names to database column names
          const columnMap: Record<string, string> = {
            'userId': 'user_id',
            'userName': 'user_name',
            'firstName': 'first_name',
            'lastName': 'last_name',
            'emailAddress': 'email_address',
            'userRole': 'user_role',
            'countryCode': 'country_code',
            'createdAt': 'created_at',
            'updatedAt': 'updated_at',
            'lastLogin': 'last_login',
            'hasRelatedStore': 'has_related_store',
          };
          const dbField = columnMap[field] || field;
          return `${dbField} ${validDirection}`;
        });
        orderBy = `ORDER BY ${sortParts.join(', ')}`;
      }

      // Build LIMIT and OFFSET
      const offset = (page - 1) * limit;
      const query = `SELECT * FROM ag_users ${whereClause} ${orderBy} LIMIT ? OFFSET ?`;
      const queryValues = [...values, limit, offset];

      const users = await prisma.$queryRawUnsafe<AgUser[]>(query, ...queryValues);

      return {
        success: true,
        total,
        users,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      console.error('AgUsersModel.findAll error:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  static async findById(userId: number): Promise<AgUser | null> {
    try {
      return await prisma.agUsers.findUnique({
        where: {
          userId: userId,
        },
      });
    } catch (error) {
      console.error('AgUsersModel.findById error:', error);
      throw error;
    }
  }

  /**
   * Find user by username
   */
  static async findByUsername(username: string): Promise<AgUser | null> {
    return prisma.agUsers.findFirst({
      where: {
        userName: username,
      },
    });
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<AgUser | null> {
    return prisma.agUsers.findFirst({
      where: {
        emailAddress: email,
      },
    });
  }

  /**
   * Create a new user
   */
  static async create(userData: CreateAgUserData, createdBy?: number): Promise<AgUser> {
    try {
      // Hash password if not already hashed
      const hashedPassword = userData.user_password.startsWith('$2')
        ? userData.user_password
        : await bcrypt.hash(userData.user_password, 10);

      // Generate token
      const token = randomBytes(32).toString('hex');

      const createData: {
        userName: string;
        firstName: string | null;
        lastName: string | null;
        userPassword: string;
        userRole: number;
        emailAddress: string | null;
        address: string | null;
        phoneNumberOne: string | null;
        countryCode: string;
        description: string | null;
        birthDate: Date | null;
        mainImage: string | null;
        token: string;
        hasRelatedStore: number;
        createdBy: number | null;
        gender?: 'Male' | 'Female' | 'Others' | null;
      } = {
        userName: userData.user_name,
        firstName: userData.first_name || null,
        lastName: userData.last_name || null,
        userPassword: hashedPassword,
        userRole: userData.user_role,
        emailAddress: userData.email_address || null,
        address: userData.address || null,
        phoneNumberOne: userData.phone_number_one || null,
        countryCode: userData.country_code,
        description: userData.description || null,
        birthDate: userData.birth_date || null,
        mainImage: userData.main_image || null,
        token: token,
        hasRelatedStore: userData.has_related_store || 0,
        createdBy: createdBy || null,
      };

      // Include gender as enum value if provided, otherwise null
      // Valid enum values: "Male", "Female", "Others"
      if (userData.gender && typeof userData.gender === 'string' && userData.gender.trim()) {
        const trimmedGender = userData.gender.trim() as 'Male' | 'Female' | 'Others';
        // Validate against enum values
        if (trimmedGender === 'Male' || trimmedGender === 'Female' || trimmedGender === 'Others') {
          createData.gender = trimmedGender;
        } else {
          createData.gender = null;
        }
      } else {
        createData.gender = null;
      }

      return await prisma.agUsers.create({
        data: createData,
      });
    } catch (error) {
      console.error('AgUsersModel.create error:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to create user: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Update user
   */
  static async update(
    userId: number,
    updates: Partial<CreateAgUserData>,
    updatedBy?: number
  ): Promise<AgUser> {
    try {
      const updateData: {
        userName?: string;
        firstName?: string | null;
        lastName?: string | null;
        userRole?: number;
        emailAddress?: string | null;
        address?: string | null;
        phoneNumberOne?: string | null;
        countryCode?: string;
        gender?: 'Male' | 'Female' | 'Others' | null;
        description?: string | null;
        birthDate?: Date | null;
        mainImage?: string | null;
        hasRelatedStore?: number;
        userPassword?: string;
        updatedBy?: number | null;
      } = {};

      if (updates.user_name !== undefined) updateData.userName = updates.user_name;
      if (updates.first_name !== undefined) updateData.firstName = updates.first_name;
      if (updates.last_name !== undefined) updateData.lastName = updates.last_name;
      if (updates.user_role !== undefined) updateData.userRole = updates.user_role;
      if (updates.email_address !== undefined) updateData.emailAddress = updates.email_address;
      if (updates.address !== undefined) updateData.address = updates.address;
      if (updates.phone_number_one !== undefined) updateData.phoneNumberOne = updates.phone_number_one;
      if (updates.country_code !== undefined) updateData.countryCode = updates.country_code;
      if (updates.gender !== undefined) {
        if (updates.gender && typeof updates.gender === 'string' && updates.gender.trim()) {
          const trimmedGender = updates.gender.trim() as 'Male' | 'Female' | 'Others';
          // Validate against enum values
          if (trimmedGender === 'Male' || trimmedGender === 'Female' || trimmedGender === 'Others') {
            updateData.gender = trimmedGender;
          } else {
            updateData.gender = null;
          }
        } else {
          updateData.gender = null;
        }
      }
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.birth_date !== undefined) updateData.birthDate = updates.birth_date;
      if (updates.main_image !== undefined) updateData.mainImage = updates.main_image;
      if (updates.has_related_store !== undefined) updateData.hasRelatedStore = updates.has_related_store;

      // Handle password update
      if (updates.user_password) {
        const hashedPassword = updates.user_password.startsWith('$2')
          ? updates.user_password
          : await bcrypt.hash(updates.user_password, 10);
        updateData.userPassword = hashedPassword;
      }

      if (updatedBy !== undefined) {
        updateData.updatedBy = updatedBy;
      }

      return await prisma.agUsers.update({
        where: {
          userId: userId,
        },
        data: updateData,
      });
    } catch (error) {
      console.error('AgUsersModel.update error:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to update user: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete user
   */
  static async delete(userId: number): Promise<boolean> {
    try {
      await prisma.agUsers.delete({
        where: {
          userId: userId,
        },
      });
      return true;
    } catch (error) {
      console.error('AgUsersModel.delete error:', error);
      throw error;
    }
  }

  /**
   * Bulk delete users
   */
  static async bulkDelete(userIds: number[]): Promise<boolean> {
    try {
      await prisma.agUsers.deleteMany({
        where: {
          userId: {
            in: userIds,
          },
        },
      });
      return true;
    } catch (error) {
      console.error('AgUsersModel.bulkDelete error:', error);
      throw error;
    }
  }

  /**
   * Update last login
   */
  static async updateLastLogin(userId: number): Promise<void> {
    await prisma.agUsers.update({
      where: {
        userId: userId,
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
   * Check if username exists
   */
  static async usernameExists(username: string): Promise<boolean> {
    const user = await this.findByUsername(username);
    return user !== null;
  }

  /**
   * Find user by token
   */
  static async findByToken(token: string): Promise<AgUser | null> {
    return prisma.agUsers.findFirst({
      where: {
        token: token,
      },
    });
  }

  /**
   * Update user token
   */
  static async updateToken(userId: number, token: string): Promise<void> {
    await prisma.agUsers.update({
      where: {
        userId: userId,
      },
      data: {
        token: token,
      },
    });
  }
}
