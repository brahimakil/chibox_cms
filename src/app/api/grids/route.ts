import { NextRequest, NextResponse } from 'next/server';
import { GridsController } from '@/controllers/GridsController';

// GET - List all grids
export async function GET(request: NextRequest) {
  try {
    return await GridsController.index(request);
  } catch (error) {
    console.error('API route error (GET /api/grids):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// POST - Create a new grid
export async function POST(request: NextRequest) {
  try {
    return await GridsController.create(request);
  } catch (error) {
    console.error('API route error (POST /api/grids):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

