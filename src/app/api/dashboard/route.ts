import { NextRequest, NextResponse } from 'next/server';
import { DashboardController } from '@/controllers/DashboardController';

/**
 * @deprecated This monolithic endpoint is DEPRECATED and SLOW (5-10 seconds).
 * 
 * ⚠️ WARNING: This endpoint makes 50+ database queries and should NOT be used.
 * 
 * ✅ Use the new split endpoints instead:
 * - GET /api/dashboard/stats - Basic statistics (100-200ms) ⚡
 * - GET /api/dashboard/charts - Chart data (300-500ms) ⚡
 * - GET /api/dashboard/recent-orders - Recent orders (200-400ms) ⚡
 * - GET /api/dashboard/top-products - Top products (200-300ms) ⚡
 * - GET /api/dashboard/top-categories - Top categories (200-400ms) ⚡
 * 
 * 📚 Migration guide: See DASHBOARD_API_SPLIT.md and MIGRATION_GUIDE.md
 * 
 * This endpoint is kept for backward compatibility only and may be removed in the future.
 */
export async function GET(request: NextRequest) {
  try {
    // Log deprecation warning
    console.warn(
      '⚠️ DEPRECATED: /api/dashboard endpoint is deprecated. ' +
      'Use split endpoints for 90% faster performance. ' +
      'See DASHBOARD_API_SPLIT.md for migration guide.'
    );
    
    return await DashboardController.index(request);
  } catch (error) {
    console.error('API route error (GET /api/dashboard):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

