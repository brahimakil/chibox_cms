import { NextRequest, NextResponse } from 'next/server';
import { FlashSalesController } from '@/controllers/FlashSalesController';

// GET - Get products for a flash sale
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
        { success: false, error: 'Invalid flash sale ID' },
        { status: 400 }
      );
    }
    return await FlashSalesController.getFlashSaleProducts(request, id);
  } catch (error) {
    console.error('API route error (GET /api/flash-sales/[id]/products):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

