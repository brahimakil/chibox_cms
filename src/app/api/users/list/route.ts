import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Get users list for combobox (id and name)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const limit = searchParams.get('limit') || '50';

    const where: any = {
      isActive: 1, // Only active users
    };

    // Use raw SQL for MySQL case-insensitive search
    let query = `SELECT id, first_name, last_name, email FROM users WHERE is_active = 1`;
    const values: any[] = [];
    
    if (search) {
      query += ` AND (LOWER(first_name) LIKE LOWER(?) OR LOWER(last_name) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?))`;
      const searchPattern = `%${search}%`;
      values.push(searchPattern, searchPattern, searchPattern);
    }
    
    query += ` ORDER BY first_name ASC LIMIT ?`;
    values.push(parseInt(limit));
    
    const users = await prisma.$queryRawUnsafe<any[]>(query, ...values);

    // Format for combobox: { id, label }
    const formattedUsers = users.map((user: any) => ({
      id: Number(user.id),
      label: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || `User ${user.id}`,
      value: Number(user.id),
    }));

    return NextResponse.json({
      success: true,
      users: formattedUsers,
    });
  } catch (error) {
    console.error('Error fetching users list:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users',
      },
      { status: 500 }
    );
  }
}

