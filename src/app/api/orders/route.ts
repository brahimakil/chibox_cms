import { NextRequest, NextResponse } from 'next/server';
import { OrderController } from '@/controllers/OrderController';

// GET - List all orders
export async function GET(request: NextRequest) {
  try {
    return await OrderController.index(request);
  } catch (error) {
    console.error('API route error (GET /api/orders):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// POST - Create a new order
export async function POST(request: NextRequest) {
  try {
    return await OrderController.create(request);
  } catch (error) {
    console.error('API route error (POST /api/orders):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

