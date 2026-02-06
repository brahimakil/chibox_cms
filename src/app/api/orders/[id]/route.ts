import { NextRequest, NextResponse } from 'next/server';
import { OrderController } from '@/controllers/OrderController';

// GET - Get single order by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      return OrderController.show(request, 0); // Will return 404
    }
    return await OrderController.show(request, orderId);
  } catch (error) {
    console.error('API route error (GET /api/orders/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// PUT - Update order
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      return OrderController.update(request, 0); // Will return error
    }
    return await OrderController.update(request, orderId);
  } catch (error) {
    console.error('API route error (PUT /api/orders/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      return OrderController.delete(request, 0); // Will return error
    }
    return await OrderController.delete(request, orderId);
  } catch (error) {
    console.error('API route error (DELETE /api/orders/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

