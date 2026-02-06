import { NextRequest, NextResponse } from 'next/server';
import { CategoryController } from '@/controllers/CategoryController';

// POST - Bulk delete categories
export async function POST(request: NextRequest) {
  try {
    return await CategoryController.bulkDelete(request);
  } catch (error) {
    console.error('API route error (POST /api/categories/bulk-delete):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

