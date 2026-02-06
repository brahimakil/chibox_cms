import { NextRequest, NextResponse } from 'next/server';
import { FlashSalesModel } from '@/models/FlashSales';

// GET - Get flash sales list for combobox (id and name) with pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    const result = await FlashSalesModel.findAll({
      search: search || undefined,
      page,
      limit,
      sort: ['title:asc'],
    });

    // Format for combobox: { id, label }
    const formattedFlashSales = result.flashSales.map((flashSale) => ({
      id: flashSale.id,
      label: flashSale.title || `Flash Sale ${flashSale.id}`,
      value: flashSale.id,
    }));

    const hasMore = result.totalPages ? page < result.totalPages : false;

    return NextResponse.json({
      success: true,
      flashSales: formattedFlashSales,
      pagination: {
        page,
        limit,
        total: result.total,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Error fetching flash sales list:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch flash sales',
      },
      { status: 500 }
    );
  }
}

