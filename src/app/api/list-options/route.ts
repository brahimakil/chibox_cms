import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Get list options by list_id
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const listId = searchParams.get('id');
    const page = parseInt(searchParams.get('page') || '1');
    const q = searchParams.get('q') || '';
    
    if (!listId) {
      return NextResponse.json(
        { success: false, error: 'List ID is required' },
        { status: 400 }
      );
    }

    const offset = (page - 1) * 10;
    const limit = 10;

    let whereClause = `list_id = ?`;
    const values: any[] = [parseInt(listId)];

    if (q && q.trim()) {
      whereClause += ` AND name LIKE ?`;
      values.push(`%${q.trim()}%`);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM ag_list_options WHERE ${whereClause}`;
    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      countQuery,
      ...values
    );
    const total = Number(countResult[0]?.count || 0);

    // Get options
    const query = `SELECT id, name as text FROM ag_list_options WHERE ${whereClause} LIMIT ? OFFSET ?`;
    const queryValues = [...values, limit, offset];
    const rawOptions = await prisma.$queryRawUnsafe<any[]>(query, ...queryValues);

    const results = rawOptions.map((row: any) => ({
      id: Number(row.id),
      text: row.text || '',
    }));

    return NextResponse.json({
      results,
      pagination: {
        more: results.length === limit,
      },
    });
  } catch (error) {
    console.error('API route error (GET /api/list-options):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

