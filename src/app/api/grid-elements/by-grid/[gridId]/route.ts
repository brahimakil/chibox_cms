import { NextRequest, NextResponse } from 'next/server';
import { GridElementsController } from '@/controllers/GridElementsController';

// GET - Get elements for a specific grid
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gridId: string }> | { gridId: string } }
) {
  try {
    // Handle both Promise and direct params (Next.js 15+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const gridId = parseInt(resolvedParams.gridId);
    
    if (isNaN(gridId) || !resolvedParams.gridId) {
      console.error('Invalid grid ID:', resolvedParams.gridId);
      return NextResponse.json(
        { success: false, error: `Invalid grid ID: ${resolvedParams.gridId}` },
        { status: 400 }
      );
    }
    return await GridElementsController.byGrid(request, gridId);
  } catch (error) {
    console.error('API route error (GET /api/grid-elements/by-grid/[gridId]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
