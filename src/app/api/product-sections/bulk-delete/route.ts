import { NextRequest, NextResponse } from 'next/server';
import { ProductSectionsController } from '@/controllers/ProductSectionsController';

// POST - Bulk delete product sections
export async function POST(request: NextRequest) {
  try {
    return await ProductSectionsController.bulkDelete(request);
  } catch (error) {
    console.error('API route error (POST /api/product-sections/bulk-delete):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

