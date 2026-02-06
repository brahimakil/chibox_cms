import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Get categories list for combobox (id and name) with pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    // Use raw SQL for MySQL case-insensitive search
    let query = `SELECT id, category_name FROM category`;
    let countQuery = `SELECT COUNT(*) as total FROM category`;
    const values: (string | number)[] = [];
    const countValues: (string | number)[] = [];
    
    if (search) {
      // Check if search is numeric (ID search)
      const searchNum = parseInt(search)
      if (!isNaN(searchNum)) {
        // Search by ID
        const whereClause = ` WHERE id = ?`;
        query += whereClause;
        countQuery += whereClause;
        values.push(searchNum);
        countValues.push(searchNum);
      } else {
        // Search by name
        const whereClause = ` WHERE LOWER(category_name) LIKE LOWER(?)`;
        query += whereClause;
        countQuery += whereClause;
        const searchPattern = `%${search}%`;
        values.push(searchPattern);
        countValues.push(searchPattern);
      }
    }
    
    // Get total count
    const countResult = await prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
      countQuery,
      ...countValues
    );
    const total = Number(countResult[0]?.total || 0);
    const hasMore = offset + limit < total;
    
    query += ` ORDER BY category_name ASC LIMIT ? OFFSET ?`;
    values.push(limit, offset);
    
    interface CategoryRow {
      id: number;
      category_name: string | null;
    }
    
    const categories = await prisma.$queryRawUnsafe<CategoryRow[]>(query, ...values);

    // Format for combobox: { id, label }
    const formattedCategories = categories.map((category) => ({
      id: Number(category.id),
      label: category.category_name || `Category ${category.id}`,
      value: Number(category.id),
    }));

    return NextResponse.json({
      success: true,
      categories: formattedCategories,
      pagination: {
        page,
        limit,
        total,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Error fetching categories list:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch categories',
      },
      { status: 500 }
    );
  }
}

