import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Get products list for combobox (id and name) with pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    // Use raw SQL for MySQL case-insensitive search
    // Use COALESCE to get the first non-null value: display_name, product_name, original_name, or fallback to id
    let query = `SELECT id, product_name, display_name, original_name FROM product`;
    let countQuery = `SELECT COUNT(*) as total FROM product`;
    const values: (string | number)[] = [];
    const countValues: (string | number)[] = [];
    
    if (search) {
      const whereClause = ` WHERE (
        LOWER(COALESCE(NULLIF(display_name, ''), NULLIF(product_name, ''), NULLIF(original_name, ''), '')) LIKE LOWER(?)
        OR LOWER(product_name) LIKE LOWER(?)
        OR LOWER(display_name) LIKE LOWER(?)
        OR LOWER(original_name) LIKE LOWER(?)
      )`;
      const searchPattern = `%${search}%`;
      query += whereClause;
      countQuery += whereClause;
      values.push(searchPattern, searchPattern, searchPattern, searchPattern);
      countValues.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }
    
    // Get total count
    const countResult = await prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
      countQuery,
      ...countValues
    );
    const total = Number(countResult[0]?.total || 0);
    const hasMore = offset + limit < total;
    
    query += ` ORDER BY COALESCE(NULLIF(display_name, ''), NULLIF(product_name, ''), NULLIF(original_name, '')) ASC LIMIT ? OFFSET ?`;
    values.push(limit, offset);
    
    interface ProductRow {
      id: number;
      product_name: string | null;
      display_name: string | null;
      original_name: string | null;
    }
    
    const products = await prisma.$queryRawUnsafe<ProductRow[]>(query, ...values);

    // Format for combobox: { id, label }
    // Use display_name first, then product_name, then original_name, then fallback to id
    // This matches the logic used in the products page: displayName || productName || 'N/A'
    const formattedProducts = products.map((product) => {
      // Handle null/undefined and empty strings
      const displayName = (product.display_name && product.display_name.trim()) || null;
      const productName = (product.product_name && product.product_name.trim()) || null;
      const originalName = (product.original_name && product.original_name.trim()) || null;
      
      // Use display_name first (matches products page), then product_name, then original_name, then fallback
      const label = displayName || productName || originalName || `Product ${product.id}`;
      
      // Log for debugging if we're falling back to Product ID
      if (!displayName && !productName && !originalName) {
        console.warn(`[Products List API] Product ${product.id} has no name fields populated`);
      }
      
      return {
        id: Number(product.id),
        label: label,
        value: Number(product.id),
      };
    });

    return NextResponse.json({
      success: true,
      products: formattedProducts,
      pagination: {
        page,
        limit,
        total,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Error fetching products list:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch products',
      },
      { status: 500 }
    );
  }
}

