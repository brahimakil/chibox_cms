import { NextRequest, NextResponse } from 'next/server';
import { GridElementsController } from '@/controllers/GridElementsController';

// GET - List all grid elements
export async function GET(request: NextRequest) {
  try {
    return await GridElementsController.index(request);
  } catch (error) {
    console.error('API route error (GET /api/grid-elements):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// POST - Create a new grid element
export async function POST(request: NextRequest) {
  try {
    return await GridElementsController.create(request);
  } catch (error) {
    console.error('API route error (POST /api/grid-elements):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
