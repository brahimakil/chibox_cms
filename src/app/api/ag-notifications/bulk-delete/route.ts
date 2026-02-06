import { NextRequest, NextResponse } from 'next/server';
import { AgNotificationController } from '@/controllers/AgNotificationController';

// POST - Bulk delete admin notifications
export async function POST(request: NextRequest) {
  try {
    return await AgNotificationController.bulkDelete(request);
  } catch (error) {
    console.error('API route error (POST /api/ag-notifications/bulk-delete):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

