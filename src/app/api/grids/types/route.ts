import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Get distinct type values from grids table
export async function GET(request: NextRequest) {
  try {
    const query = `SELECT DISTINCT type FROM grids WHERE type IS NOT NULL AND type != '' ORDER BY type ASC`;
    const rawTypes = await prisma.$queryRawUnsafe<Array<{ type: string }>>(query);

    const types = rawTypes.map((row: any) => row.type || '').filter(Boolean);

    return NextResponse.json({
      success: true,
      types,
    });
  } catch (error) {
    console.error('API route error (GET /api/grids/types):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

