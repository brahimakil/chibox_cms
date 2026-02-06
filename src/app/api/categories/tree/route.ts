import { NextRequest, NextResponse } from 'next/server';
import { CategoryModel } from '@/models/Category';

// GET - Get all categories for tree view (no pagination)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get('source');

    const params: {
      source?: string;
    } = {};

    if (source) {
      params.source = source;
    }

    // Fetch all categories without pagination
    const result = await CategoryModel.findAll(params);

    return NextResponse.json(result);
  } catch (error) {
    console.error('API route error (GET /api/categories/tree):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

