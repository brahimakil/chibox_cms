import { NextRequest, NextResponse } from 'next/server';
import { BrandModel } from '@/models/Brand';

// GET - Get brands list for combobox (id and name) with pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    // Check if search is numeric (ID search)
    const searchNum = parseInt(search);
    const isIdSearch = !isNaN(searchNum) && search.trim() !== '';

    const result = await BrandModel.findAll({
      search: isIdSearch ? undefined : (search || undefined),
      id: isIdSearch ? search : undefined,
      page,
      limit,
      sort: ['brand_name:asc'],
    });

    // Format for combobox: { id, label }
    const formattedBrands = result.brands.map((brand) => ({
      id: brand.id,
      label: brand.brandName || `Brand ${brand.id}`,
      value: brand.id,
    }));

    const hasMore = result.totalPages ? page < result.totalPages : false;

    return NextResponse.json({
      success: true,
      brands: formattedBrands,
      pagination: {
        page,
        limit,
        total: result.total,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Error fetching brands list:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch brands',
      },
      { status: 500 }
    );
  }
}

