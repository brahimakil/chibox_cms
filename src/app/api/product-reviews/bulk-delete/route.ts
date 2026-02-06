import { NextRequest, NextResponse } from 'next/server';
import { UsersReviewsController } from '@/controllers/UsersReviewsController';

// POST - Bulk delete product reviews
export async function POST(request: NextRequest) {
  try {
    return await UsersReviewsController.bulkDelete(request);
  } catch (error) {
    console.error('API route error (POST /api/product-reviews/bulk-delete):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

