import { NextRequest } from 'next/server';
import { UserController } from '@/controllers/UserController';

// GET - Get a single client by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const params = await Promise.resolve(context.params);
  return UserController.show(request, { params });
}

// PUT - Update a client
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const params = await Promise.resolve(context.params);
  return UserController.update(request, { params });
}

// DELETE - Delete a client
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const params = await Promise.resolve(context.params);
  return UserController.delete(request, { params });
}

