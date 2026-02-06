import { NextRequest, NextResponse } from 'next/server';
import { ProductSectionsController } from '@/controllers/ProductSectionsController';

// GET - Get single product section by ID
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
    return await ProductSectionsController.show(request, id);
  } catch (error) {
    console.error('API route error (GET /api/product-sections/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// PUT/PATCH - Update product section
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
        { success: false, error: 'Invalid product section ID' },
        { status: 400 }
      );
    }
    return await ProductSectionsController.update(request, id);
  } catch (error) {
    console.error('API route error (PUT /api/product-sections/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete product section
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
        { success: false, error: 'Invalid product section ID' },
        { status: 400 }
      );
    }
    return await ProductSectionsController.delete(request, id);
  } catch (error) {
    console.error('API route error (DELETE /api/product-sections/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

