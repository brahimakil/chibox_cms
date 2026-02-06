import { NextRequest, NextResponse } from 'next/server';
import { AgNotificationController } from '@/controllers/AgNotificationController';

// GET - Get single admin notification by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notificationId = parseInt(id);
    if (isNaN(notificationId)) {
      return AgNotificationController.show(request, 0); // Will return 404
    }
    return await AgNotificationController.show(request, notificationId);
  } catch (error) {
    console.error('API route error (GET /api/ag-notifications/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// PUT - Update admin notification
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notificationId = parseInt(id);
    if (isNaN(notificationId)) {
      return AgNotificationController.update(request, 0); // Will return error
    }
    return await AgNotificationController.update(request, notificationId);
  } catch (error) {
    console.error('API route error (PUT /api/ag-notifications/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete admin notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notificationId = parseInt(id);
    if (isNaN(notificationId)) {
      return AgNotificationController.delete(request, 0); // Will return error
    }
    return await AgNotificationController.delete(request, notificationId);
  } catch (error) {
    console.error('API route error (DELETE /api/ag-notifications/[id]):', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

