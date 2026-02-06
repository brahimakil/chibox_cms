import { NextRequest, NextResponse } from 'next/server';
import { GridElementsController } from '@/controllers/GridElementsController';

// POST - Update positions for multiple elements
export async function POST(request: NextRequest) {
  try {
    return await GridElementsController.updatePositions(request);
  } catch (error) {
    console.error('API route error (POST /api/grid-elements/update-positions):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
