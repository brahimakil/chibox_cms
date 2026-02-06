import { NextRequest, NextResponse } from 'next/server';
import { CategoryController } from '@/controllers/CategoryController';

// GET - Get single category by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const categoryId = parseInt(id);
    if (isNaN(categoryId)) {
      return CategoryController.show(request, 0); // Will return 404
    }
    return await CategoryController.show(request, categoryId);
  } catch (error) {
    console.error('API route error (GET /api/categories/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// PUT - Update category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const categoryId = parseInt(id);
    if (isNaN(categoryId)) {
      return CategoryController.update(request, 0); // Will return error
    }
    return await CategoryController.update(request, categoryId);
  } catch (error) {
    console.error('API route error (PUT /api/categories/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const categoryId = parseInt(id);
    if (isNaN(categoryId)) {
      return CategoryController.delete(request, 0); // Will return error
    }
    return await CategoryController.delete(request, categoryId);
  } catch (error) {
    console.error('API route error (DELETE /api/categories/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

