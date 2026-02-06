import { NextRequest, NextResponse } from 'next/server';
import { OrderController } from '@/controllers/OrderController';

// POST - Bulk delete orders
export async function POST(request: NextRequest) {
  try {
    return await OrderController.bulkDelete(request);
  } catch (error) {
    console.error('API route error (POST /api/orders/bulk-delete):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

