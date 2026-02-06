import { NextRequest, NextResponse } from 'next/server';
import { UsersReviewsController } from '@/controllers/UsersReviewsController';

// GET - List all product reviews
export async function GET(request: NextRequest) {
  try {
    return await UsersReviewsController.index(request);
  } catch (error) {
    console.error('API route error (GET /api/product-reviews):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// POST - Create a new product review
export async function POST(request: NextRequest) {
  try {
    return await UsersReviewsController.create(request);
  } catch (error) {
    console.error('API route error (POST /api/product-reviews):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

