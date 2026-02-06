import { NextRequest, NextResponse } from 'next/server';
import { ProductSectionsController } from '@/controllers/ProductSectionsController';

// GET - Get products for a product section
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle Next.js 15+ where params might be a Promise
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product section ID' },
        { status: 400 }
      );
    }
    return await ProductSectionsController.getSectionProducts(request, id);
  } catch (error) {
    console.error('API route error (GET /api/product-sections/[id]/products):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

