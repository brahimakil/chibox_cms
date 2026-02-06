import { NextRequest, NextResponse } from 'next/server';
import { NotificationController } from '@/controllers/NotificationController';

// POST - Bulk delete notifications
export async function POST(request: NextRequest) {
  try {
    return await NotificationController.bulkDelete(request);
  } catch (error) {
    console.error('API route error (POST /api/notifications/bulk-delete):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

