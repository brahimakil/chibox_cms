import { NextRequest, NextResponse } from 'next/server';
import { AgNotificationController } from '@/controllers/AgNotificationController';

// POST - Mark all admin notifications as read
export async function POST(request: NextRequest) {
  try {
    return await AgNotificationController.markAllAsRead(request);
  } catch (error) {
    console.error('API route error (POST /api/ag-notifications/mark-all-read):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

