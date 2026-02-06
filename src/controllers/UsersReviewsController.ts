import { NextRequest, NextResponse } from 'next/server';
import { UsersReviewsModel, CreateUsersReviewsData } from '@/models/UsersReviews';

export class UsersReviewsController {
  /**
   * Get all product reviews with optional pagination
   */
  static async index(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams;
      const page = searchParams.get('page');
      const limit = searchParams.get('limit');
      const search = searchParams.get('search') || searchParams.get('q');
      const id = searchParams.get('id');
      const r_user_id = searchParams.get('r_user_id');
      const r_product_id = searchParams.get('r_product_id');
      const rating = searchParams.get('rating');
      const status = searchParams.get('status');
      const sortParams = searchParams.getAll('sort');

      const params: {
        page?: number;
        limit?: number;
        search?: string;
        id?: string;
        r_user_id?: string;
        r_product_id?: string;
        rating?: string;
        status?: string;
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
      if (r_user_id) {
        params.r_user_id = r_user_id;
      }
      if (r_product_id) {
        params.r_product_id = r_product_id;
      }
      if (rating) {
        params.rating = rating;
      }
      if (status !== null && status !== undefined && status !== '') {
        params.status = status;
      }
      if (sortParams.length > 0) {
        params.sort = sortParams;
      }

      const result = await UsersReviewsModel.findAll(params);
      return NextResponse.json(result);
    } catch (error) {
      console.error('UsersReviewsController.index error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch product reviews',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Get single product review by ID
   */
  static async show(request: NextRequest, id: number) {
    try {
      const review = await UsersReviewsModel.findById(id);

      if (!review) {
        return NextResponse.json(
          { success: false, error: 'Product review not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        review,
      });
    } catch (error) {
      console.error('UsersReviewsController.show error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch product review',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Create a new product review
   */
  static async create(request: NextRequest) {
    try {
      const body = await request.json();

      if (!body.r_user_id || !body.r_product_id || body.rating === undefined || body.status === undefined) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: r_user_id, r_product_id, rating, status' },
          { status: 400 }
        );
      }

      const reviewData: CreateUsersReviewsData = {
        r_user_id: body.r_user_id,
        r_product_id: body.r_product_id,
        rating: body.rating,
        text: body.text ?? null,
        status: body.status,
      };

      const result = await UsersReviewsModel.create(reviewData);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || result.message || 'Failed to create product review',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      console.error('UsersReviewsController.create error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create product review',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Update product review
   */
  static async update(request: NextRequest, id: number) {
    try {
      const body = await request.json();

      const updateData: Partial<CreateUsersReviewsData> = {};

      if (body.r_user_id !== undefined) updateData.r_user_id = body.r_user_id;
      if (body.r_product_id !== undefined) updateData.r_product_id = body.r_product_id;
      if (body.rating !== undefined) updateData.rating = body.rating;
      if (body.text !== undefined) updateData.text = body.text;
      if (body.status !== undefined) updateData.status = body.status;

      const result = await UsersReviewsModel.update(id, updateData);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || result.message || 'Failed to update product review',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('UsersReviewsController.update error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update product review',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Delete product review
   */
  static async delete(request: NextRequest, id: number) {
    try {
      const result = await UsersReviewsModel.delete(id);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to delete product review',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('UsersReviewsController.delete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete product review',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Bulk delete product reviews
   */
  static async bulkDelete(request: NextRequest) {
    try {
      const body = await request.json();
      const { ids } = body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No product review IDs provided' },
          { status: 400 }
        );
      }

      const result = await UsersReviewsModel.bulkDelete(ids);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to delete product reviews',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('UsersReviewsController.bulkDelete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete product reviews',
        },
        { status: 500 }
      );
    }
  }
}

