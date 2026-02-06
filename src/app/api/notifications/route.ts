import { NextRequest, NextResponse } from 'next/server';
import { NotificationController } from '@/controllers/NotificationController';

// GET - List all notifications
export async function GET(request: NextRequest) {
  try {
    return await NotificationController.index(request);
  } catch (error) {
    console.error('API route error (GET /api/notifications):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// POST - Create a new notification
export async function POST(request: NextRequest) {
  try {
    return await NotificationController.create(request);
  } catch (error) {
    console.error('API route error (POST /api/notifications):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

