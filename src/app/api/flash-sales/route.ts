import { NextRequest, NextResponse } from 'next/server';
import { FlashSalesController } from '@/controllers/FlashSalesController';

// GET - List all flash sales
export async function GET(request: NextRequest) {
  try {
    return await FlashSalesController.index(request);
  } catch (error) {
    console.error('API route error (GET /api/flash-sales):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// POST - Create a new flash sale
export async function POST(request: NextRequest) {
  try {
    return await FlashSalesController.create(request);
  } catch (error) {
    console.error('API route error (POST /api/flash-sales):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

