import { NextRequest, NextResponse } from 'next/server';
import { GridsController } from '@/controllers/GridsController';

// POST - Bulk delete grids
export async function POST(request: NextRequest) {
  try {
    return await GridsController.bulkDelete(request);
  } catch (error) {
    console.error('API route error (POST /api/grids/bulk-delete):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

