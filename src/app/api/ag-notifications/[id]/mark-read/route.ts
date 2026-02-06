import { NextRequest, NextResponse } from 'next/server';
import { AgNotificationController } from '@/controllers/AgNotificationController';

// POST - Mark admin notification as read
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notificationId = parseInt(id);
    if (isNaN(notificationId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid notification ID' },
        { status: 400 }
      );
    }
    return await AgNotificationController.markAsRead(request, notificationId);
  } catch (error) {
    console.error('API route error (POST /api/ag-notifications/[id]/mark-read):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

