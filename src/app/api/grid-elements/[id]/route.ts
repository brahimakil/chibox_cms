import { NextRequest, NextResponse } from 'next/server';
import { GridElementsController } from '@/controllers/GridElementsController';

// GET - Get single grid element by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and direct params (Next.js 15+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id) || !resolvedParams.id) {
      console.error('Invalid grid element ID:', resolvedParams.id);
      return NextResponse.json(
        { success: false, error: `Invalid grid element ID: ${resolvedParams.id}` },
        { status: 400 }
      );
    }
    return await GridElementsController.show(request, id);
  } catch (error) {
    console.error('API route error (GET /api/grid-elements/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// PUT/PATCH - Update grid element
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and direct params (Next.js 15+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id) || !resolvedParams.id) {
      console.error('Invalid grid element ID:', resolvedParams.id);
      return NextResponse.json(
        { success: false, error: `Invalid grid element ID: ${resolvedParams.id}` },
        { status: 400 }
      );
    }
    return await GridElementsController.update(request, id);
  } catch (error) {
    console.error('API route error (PUT /api/grid-elements/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  return PUT(request, { params });
}

// DELETE - Delete grid element
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and direct params (Next.js 15+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id) || !resolvedParams.id) {
      console.error('Invalid grid element ID:', resolvedParams.id);
      return NextResponse.json(
        { success: false, error: `Invalid grid element ID: ${resolvedParams.id}` },
        { status: 400 }
      );
    }
    return await GridElementsController.delete(request, id);
  } catch (error) {
    console.error('API route error (DELETE /api/grid-elements/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
