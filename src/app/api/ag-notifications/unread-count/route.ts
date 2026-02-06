import { NextRequest, NextResponse } from 'next/server';
import { AgNotificationController } from '@/controllers/AgNotificationController';

// GET - Get unread admin notifications count
export async function GET(request: NextRequest) {
  try {
    return await AgNotificationController.unreadCount();
  } catch (error) {
    console.error('API route error (GET /api/ag-notifications/unread-count):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

