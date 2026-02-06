import { NextRequest, NextResponse } from 'next/server';
import { AgNotificationController } from '@/controllers/AgNotificationController';

// GET - List all admin notifications
export async function GET(request: NextRequest) {
  try {
    return await AgNotificationController.index(request);
  } catch (error) {
    console.error('API route error (GET /api/ag-notifications):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// POST - Create a new admin notification
export async function POST(request: NextRequest) {
  try {
    return await AgNotificationController.create(request);
  } catch (error) {
    console.error('API route error (POST /api/ag-notifications):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

