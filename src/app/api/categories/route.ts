import { NextRequest, NextResponse } from 'next/server';
import { CategoryController } from '@/controllers/CategoryController';

// GET - List all categories
export async function GET(request: NextRequest) {
  try {
    return await CategoryController.index(request);
  } catch (error) {
    console.error('API route error (GET /api/categories):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// POST - Create a new category
export async function POST(request: NextRequest) {
  try {
    return await CategoryController.create(request);
  } catch (error) {
    console.error('API route error (POST /api/categories):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

