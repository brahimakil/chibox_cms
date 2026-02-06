import { NextRequest, NextResponse } from 'next/server';
import { ProductController } from '@/controllers/ProductController';

// GET - List all products
export async function GET(request: NextRequest) {
  try {
    return await ProductController.index(request);
  } catch (error) {
    console.error('API route error (GET /api/products):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// POST - Create a new product
export async function POST(request: NextRequest) {
  try {
    return await ProductController.create(request);
  } catch (error) {
    console.error('API route error (POST /api/products):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

