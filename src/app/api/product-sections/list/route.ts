import { NextRequest, NextResponse } from 'next/server';
import { ProductSectionsModel } from '@/models/ProductSections';

// GET - Get product sections list for combobox (id and name) with pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    // Check if search is numeric (ID search)
    const searchNum = parseInt(search);
    const isIdSearch = !isNaN(searchNum) && search.trim() !== '';

    const result = await ProductSectionsModel.findAll({
      search: isIdSearch ? undefined : (search || undefined),
      id: isIdSearch ? search : undefined,
      page,
      limit,
      sort: ['section_name:asc'],
    });

    // Format for combobox: { id, label }
    const formattedSections = result.sections.map((section) => ({
      id: section.id,
      label: section.sectionName || `Section ${section.id}`,
      value: section.id,
    }));

    const hasMore = result.totalPages ? page < result.totalPages : false;

    return NextResponse.json({
      success: true,
      sections: formattedSections,
      pagination: {
        page,
        limit,
        total: result.total,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Error fetching product sections list:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product sections',
      },
      { status: 500 }
    );
  }
}

