import { NextRequest, NextResponse } from 'next/server';
import { NotificationController } from '@/controllers/NotificationController';

// GET - Get single notification by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notificationId = parseInt(id);
    if (isNaN(notificationId)) {
      return NotificationController.show(request, 0); // Will return 404
    }
    return await NotificationController.show(request, notificationId);
  } catch (error) {
    console.error('API route error (GET /api/notifications/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// PUT - Update notification
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notificationId = parseInt(id);
    if (isNaN(notificationId)) {
      return NotificationController.update(request, 0); // Will return error
    }
    return await NotificationController.update(request, notificationId);
  } catch (error) {
    console.error('API route error (PUT /api/notifications/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notificationId = parseInt(id);
    if (isNaN(notificationId)) {
      return NotificationController.delete(request, 0); // Will return error
    }
    return await NotificationController.delete(request, notificationId);
  } catch (error) {
    console.error('API route error (DELETE /api/notifications/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

