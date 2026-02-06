import { NextRequest, NextResponse } from 'next/server';
import { FlashSalesController } from '@/controllers/FlashSalesController';

// POST - Bulk delete flash sales
export async function POST(request: NextRequest) {
  try {
    return await FlashSalesController.bulkDelete(request);
  } catch (error) {
    console.error('API route error (POST /api/flash-sales/bulk-delete):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

