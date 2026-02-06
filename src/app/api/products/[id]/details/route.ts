import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Get product details with categories, brand, image count
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    // Fetch product with brand, categories, image count, and store name
    const query = `
      SELECT 
        t1.id,
        t1.product_name,
        t1.display_name,
        t1.original_name,
        t1.main_image,
        t1.product_qty_left,
        t2.brand_name,
        t7.store_name,
        (SELECT COUNT(t5.id) 
         FROM ag_attachment t5 
         WHERE t5.row_id = t1.id 
         AND t5.table_name = 154 
         AND t5.type = 2) as image_count,
        (SELECT GROUP_CONCAT(t4.category_name SEPARATOR ', ') 
         FROM product_categories t3 
         INNER JOIN category t4 ON t4.id = t3.r_category_id 
         WHERE t3.product_id = t1.id) as categories
      FROM product t1
      LEFT JOIN brand t2 ON t1.brand = t2.id
      LEFT JOIN stores t7 ON t1.r_store_id = t7.id
      WHERE t1.id = ?
      LIMIT 1
    `;

    const result = await prisma.$queryRawUnsafe<any[]>(query, id);

    if (!result || result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const row = result[0];

    return NextResponse.json({
      success: true,
      product: {
        id: Number(row.id),
        productName: row.product_name || '',
        displayName: row.display_name || null,
        originalName: row.original_name || null,
        mainImage: row.main_image || null,
        productQtyLeft: Number(row.product_qty_left || 0),
        brandName: row.brand_name || null,
        imageCount: Number(row.image_count || 0),
        categories: row.categories || null,
        storeName: row.store_name || null,
      },
    });
  } catch (error) {
    console.error('Error fetching product details:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product details',
      },
      { status: 500 }
    );
  }
}

