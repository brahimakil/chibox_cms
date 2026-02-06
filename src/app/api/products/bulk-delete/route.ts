import { NextRequest, NextResponse } from 'next/server';
import { ProductController } from '@/controllers/ProductController';

// POST - Bulk delete products
export async function POST(request: NextRequest) {
  try {
    return await ProductController.bulkDelete(request);
  } catch (error) {
    console.error('API route error (POST /api/products/bulk-delete):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

