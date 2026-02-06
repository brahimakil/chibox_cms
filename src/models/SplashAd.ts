import { prisma } from '@/lib/db';

// SplashAd interface
export interface SplashAd {
  id: number;
  title: string;
  mediaType: 'image' | 'video' | 'lottie';
  mediaUrl: string;
  thumbnailUrl: string | null;
  linkType: 'product' | 'category' | 'url' | 'none';
  linkValue: string | null;
  skipDuration: number;
  totalDuration: number;
  isActive: number;
  startDate: Date | null;
  endDate: Date | null;
  viewCount: number;
  clickCount: number;
  skipCount: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CreateSplashAdData {
  title: string;
  media_type: 'image' | 'video' | 'lottie';
  media_url: string;
  thumbnail_url?: string | null;
  link_type?: 'product' | 'category' | 'url' | 'none';
  link_value?: string | null;
  skip_duration?: number;
  total_duration?: number;
  is_active?: number;
  start_date?: Date | null;
  end_date?: Date | null;
}

export interface UpdateSplashAdData extends Partial<CreateSplashAdData> {}

export interface SplashAdListResponse {
  success: boolean;
  total: number;
  splashAds: SplashAd[];
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface SplashAdResponse {
  success: boolean;
  splashAd?: SplashAd;
  message?: string;
  error?: string;
}

// Helper to map raw database row to SplashAd
function mapRowToSplashAd(row: any): SplashAd {
  return {
    id: row.id,
    title: row.title,
    mediaType: row.media_type,
    mediaUrl: row.media_url,
    thumbnailUrl: row.thumbnail_url,
    linkType: row.link_type,
    linkValue: row.link_value,
    skipDuration: row.skip_duration,
    totalDuration: row.total_duration,
    isActive: row.is_active,
    startDate: row.start_date ? new Date(row.start_date) : null,
    endDate: row.end_date ? new Date(row.end_date) : null,
    viewCount: row.view_count,
    clickCount: row.click_count,
    skipCount: row.skip_count,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
  };
}

export class SplashAdModel {
  /**
   * Fetch all splash ads with optional pagination and filters
   */
  static async findAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: number;
    mediaType?: string;
    sort?: string[];
  }): Promise<SplashAdListResponse> {
    try {
      const page = params?.page || 1;
      const limit = params?.limit || 50;

      // Build WHERE conditions
      const conditions: string[] = [];
      const values: any[] = [];

      if (params?.search) {
        conditions.push(`title LIKE ?`);
        values.push(`%${params.search}%`);
      }

      if (params?.isActive !== undefined) {
        conditions.push(`is_active = ?`);
        values.push(params.isActive);
      }

      if (params?.mediaType) {
        conditions.push(`media_type = ?`);
        values.push(params.mediaType);
      }

      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}` 
        : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM splash_ads ${whereClause}`;
      const countResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(countQuery, ...values);
      const total = Number(countResult[0]?.count || 0);

      // Build ORDER BY clause
      let orderByClause = 'ORDER BY created_at DESC';
      if (params?.sort && params.sort.length > 0) {
        const sortFields = params.sort.map(s => {
          const [field, direction] = s.split(':');
          const columnMap: Record<string, string> = {
            id: 'id',
            title: 'title',
            mediaType: 'media_type',
            isActive: 'is_active',
            createdAt: 'created_at',
            viewCount: 'view_count',
            clickCount: 'click_count',
          };
          const column = columnMap[field] || 'created_at';
          const dir = direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
          return `${column} ${dir}`;
        });
        orderByClause = `ORDER BY ${sortFields.join(', ')}`;
      }

      const offset = (page - 1) * limit;
      const queryValues = [...values, limit, offset];

      const query = `
        SELECT * FROM splash_ads 
        ${whereClause} 
        ${orderByClause} 
        LIMIT ? OFFSET ?
      `;

      const rawSplashAds = await prisma.$queryRawUnsafe<any[]>(query, ...queryValues);
      const splashAds: SplashAd[] = rawSplashAds.map(mapRowToSplashAd);

      return {
        success: true,
        total,
        splashAds,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('SplashAdModel.findAll error:', error);
      throw error;
    }
  }

  /**
   * Find splash ad by ID
   */
  static async findById(id: number): Promise<SplashAdResponse> {
    try {
      const rawSplashAds = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM splash_ads WHERE id = ? LIMIT 1`,
        id
      );

      if (!rawSplashAds || rawSplashAds.length === 0) {
        return { success: false, message: 'Splash ad not found' };
      }

      return {
        success: true,
        splashAd: mapRowToSplashAd(rawSplashAds[0]),
      };
    } catch (error) {
      console.error('SplashAdModel.findById error:', error);
      throw error;
    }
  }

  /**
   * Create a new splash ad
   */
  static async create(data: CreateSplashAdData): Promise<SplashAdResponse> {
    try {
      const now = new Date();
      
      const result = await prisma.$executeRawUnsafe(
        `INSERT INTO splash_ads (
          title, media_type, media_url, thumbnail_url, 
          link_type, link_value, skip_duration, total_duration,
          is_active, start_date, end_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        data.title,
        data.media_type || 'image',
        data.media_url,
        data.thumbnail_url || null,
        data.link_type || 'none',
        data.link_value || null,
        data.skip_duration || 5,
        data.total_duration || 10,
        data.is_active || 0,
        data.start_date || null,
        data.end_date || null,
        now,
        now
      );

      // Get the inserted ID
      const insertedId = await prisma.$queryRawUnsafe<{ id: bigint }[]>(
        `SELECT LAST_INSERT_ID() as id`
      );
      
      const newId = Number(insertedId[0]?.id);
      
      return this.findById(newId);
    } catch (error) {
      console.error('SplashAdModel.create error:', error);
      throw error;
    }
  }

  /**
   * Update a splash ad
   */
  static async update(id: number, data: UpdateSplashAdData): Promise<SplashAdResponse> {
    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (data.title !== undefined) {
        updates.push('title = ?');
        values.push(data.title);
      }
      if (data.media_type !== undefined) {
        updates.push('media_type = ?');
        values.push(data.media_type);
      }
      if (data.media_url !== undefined) {
        updates.push('media_url = ?');
        values.push(data.media_url);
      }
      if (data.thumbnail_url !== undefined) {
        updates.push('thumbnail_url = ?');
        values.push(data.thumbnail_url);
      }
      if (data.link_type !== undefined) {
        updates.push('link_type = ?');
        values.push(data.link_type);
      }
      if (data.link_value !== undefined) {
        updates.push('link_value = ?');
        values.push(data.link_value);
      }
      if (data.skip_duration !== undefined) {
        updates.push('skip_duration = ?');
        values.push(data.skip_duration);
      }
      if (data.total_duration !== undefined) {
        updates.push('total_duration = ?');
        values.push(data.total_duration);
      }
      if (data.is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(data.is_active);
      }
      if (data.start_date !== undefined) {
        updates.push('start_date = ?');
        values.push(data.start_date);
      }
      if (data.end_date !== undefined) {
        updates.push('end_date = ?');
        values.push(data.end_date);
      }

      if (updates.length === 0) {
        return { success: false, message: 'No fields to update' };
      }

      updates.push('updated_at = ?');
      values.push(new Date());
      values.push(id);

      await prisma.$executeRawUnsafe(
        `UPDATE splash_ads SET ${updates.join(', ')} WHERE id = ?`,
        ...values
      );

      return this.findById(id);
    } catch (error) {
      console.error('SplashAdModel.update error:', error);
      throw error;
    }
  }

  /**
   * Delete a splash ad
   */
  static async delete(id: number): Promise<SplashAdResponse> {
    try {
      // Get the splash ad first
      const existing = await this.findById(id);
      if (!existing.success) {
        return existing;
      }

      await prisma.$executeRawUnsafe(
        `DELETE FROM splash_ads WHERE id = ?`,
        id
      );

      return {
        success: true,
        message: 'Splash ad deleted successfully',
        splashAd: existing.splashAd,
      };
    } catch (error) {
      console.error('SplashAdModel.delete error:', error);
      throw error;
    }
  }

  /**
   * Bulk delete splash ads
   */
  static async bulkDelete(ids: number[]): Promise<{ success: boolean; deletedCount: number; message?: string }> {
    try {
      if (!ids || ids.length === 0) {
        return { success: false, deletedCount: 0, message: 'No IDs provided' };
      }

      const placeholders = ids.map(() => '?').join(',');
      const result = await prisma.$executeRawUnsafe(
        `DELETE FROM splash_ads WHERE id IN (${placeholders})`,
        ...ids
      );

      return {
        success: true,
        deletedCount: result as number,
        message: `Deleted ${result} splash ad(s)`,
      };
    } catch (error) {
      console.error('SplashAdModel.bulkDelete error:', error);
      throw error;
    }
  }

  /**
   * Toggle active status
   */
  static async toggleActive(id: number): Promise<SplashAdResponse> {
    try {
      const existing = await this.findById(id);
      if (!existing.success || !existing.splashAd) {
        return existing;
      }

      const newStatus = existing.splashAd.isActive === 1 ? 0 : 1;
      return this.update(id, { is_active: newStatus });
    } catch (error) {
      console.error('SplashAdModel.toggleActive error:', error);
      throw error;
    }
  }
}
