import { NextRequest, NextResponse } from 'next/server';
import { ProductSectionsController } from '@/controllers/ProductSectionsController';

// GET - List all product sections
export async function GET(request: NextRequest) {
  try {
    return await ProductSectionsController.index(request);
  } catch (error) {
    console.error('API route error (GET /api/product-sections):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// POST - Create a new product section
export async function POST(request: NextRequest) {
  try {
    return await ProductSectionsController.create(request);
  } catch (error) {
    console.error('API route error (POST /api/product-sections):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

