import { NextRequest, NextResponse } from 'next/server';
import { GridsController } from '@/controllers/GridsController';

// GET - Get single grid by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and direct params (Next.js 15+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id) || !resolvedParams.id) {
      console.error('Invalid grid ID:', resolvedParams.id);
      return NextResponse.json(
        { success: false, error: `Invalid grid ID: ${resolvedParams.id}` },
        { status: 400 }
      );
    }
    return await GridsController.show(request, id);
  } catch (error) {
    console.error('API route error (GET /api/grids/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// PUT/PATCH - Update grid
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and direct params (Next.js 15+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id) || !resolvedParams.id) {
      console.error('Invalid grid ID:', resolvedParams.id);
      return NextResponse.json(
        { success: false, error: `Invalid grid ID: ${resolvedParams.id}` },
        { status: 400 }
      );
    }
    return await GridsController.update(request, id);
  } catch (error) {
    console.error('API route error (PUT /api/grids/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete grid
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
        { success: false, error: `Invalid grid ID: ${resolvedParams.id}` },
        { status: 400 }
      );
    }
    return await GridsController.delete(request, id);
  } catch (error) {
    console.error('API route error (DELETE /api/grids/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

