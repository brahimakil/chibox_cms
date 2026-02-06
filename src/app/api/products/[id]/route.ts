import { NextRequest, NextResponse } from 'next/server';
import { ProductController } from '@/controllers/ProductController';

// GET - Get single product by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = parseInt(id);
    if (isNaN(productId)) {
      return ProductController.show(request, 0); // Will return 404
    }
    return await ProductController.show(request, productId);
  } catch (error) {
    console.error('API route error (GET /api/products/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// PUT - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = parseInt(id);
    if (isNaN(productId)) {
      return ProductController.update(request, 0); // Will return error
    }
    return await ProductController.update(request, productId);
  } catch (error) {
    console.error('API route error (PUT /api/products/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = parseInt(id);
    if (isNaN(productId)) {
      return ProductController.delete(request, 0); // Will return error
    }
    return await ProductController.delete(request, productId);
  } catch (error) {
    console.error('API route error (DELETE /api/products/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

