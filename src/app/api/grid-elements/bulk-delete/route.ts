import { NextRequest, NextResponse } from 'next/server';
import { GridElementsController } from '@/controllers/GridElementsController';

// POST - Bulk delete grid elements
export async function POST(request: NextRequest) {
  try {
    return await GridElementsController.bulkDelete(request);
  } catch (error) {
    console.error('API route error (POST /api/grid-elements/bulk-delete):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
