import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('q') || searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: {
      groupName?: {
        contains: string;
      };
    } = {};
    
    if (search) {
      where.groupName = {
        contains: search,
      };
    }

    // Access agUserGroups model (available after running npx prisma generate)
    // @ts-expect-error - Prisma client types may need TypeScript server restart
    const agUserGroups = prisma.agUserGroups;
    
    if (!agUserGroups) {
      return NextResponse.json(
        {
          success: false,
          error: 'User groups model not available. Please ensure Prisma client is generated.',
        },
        { status: 500 }
      );
    }

    const [groups, total] = await Promise.all([
      agUserGroups.findMany({
        where,
        select: {
          id: true,
          groupName: true,
          groupDescription: true,
        },
        orderBy: {
          groupName: 'asc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      agUserGroups.count({ where }),
    ]);

    // Format response to match Select2/combobox format
    const results = groups.map((group: { id: number; groupName: string; groupDescription: string }) => ({
      id: group.id.toString(),
      text: group.groupName,
      description: group.groupDescription,
    }));

    return NextResponse.json({
      results,
      pagination: {
        more: page * limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching user groups:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user groups',
      },
      { status: 500 }
    );
  }
}

