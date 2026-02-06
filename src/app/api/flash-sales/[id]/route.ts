import { NextRequest, NextResponse } from 'next/server';
import { FlashSalesController } from '@/controllers/FlashSalesController';

// GET - Get single flash sale by ID
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
    return await FlashSalesController.show(request, id);
  } catch (error) {
    console.error('API route error (GET /api/flash-sales/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// PUT/PATCH - Update flash sale
export async function PUT(
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
    return await FlashSalesController.update(request, id);
  } catch (error) {
    console.error('API route error (PUT /api/flash-sales/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete flash sale
export async function DELETE(
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
    return await FlashSalesController.delete(request, id);
  } catch (error) {
    console.error('API route error (DELETE /api/flash-sales/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

