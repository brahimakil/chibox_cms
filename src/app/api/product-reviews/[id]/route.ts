import { NextRequest, NextResponse } from 'next/server';
import { UsersReviewsController } from '@/controllers/UsersReviewsController';

// GET - Get single product review by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and direct params (Next.js 15+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id) || !resolvedParams.id) {
      return NextResponse.json(
        { success: false, error: `Invalid product review ID: ${resolvedParams.id}` },
        { status: 400 }
      );
    }
    return await UsersReviewsController.show(request, id);
  } catch (error) {
    console.error('API route error (GET /api/product-reviews/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// PUT/PATCH - Update product review
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and direct params (Next.js 15+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id) || !resolvedParams.id) {
      console.error('Invalid product review ID:', resolvedParams.id);
      return NextResponse.json(
        { success: false, error: `Invalid product review ID: ${resolvedParams.id}` },
        { status: 400 }
      );
    }
    return await UsersReviewsController.update(request, id);
  } catch (error) {
    console.error('API route error (PUT /api/product-reviews/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete product review
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and direct params (Next.js 15+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id) || !resolvedParams.id) {
      return NextResponse.json(
        { success: false, error: `Invalid product review ID: ${resolvedParams.id}` },
        { status: 400 }
      );
    }
    return await UsersReviewsController.delete(request, id);
  } catch (error) {
    console.error('API route error (DELETE /api/product-reviews/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

