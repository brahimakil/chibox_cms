import { NextRequest } from 'next/server';
import { AgUsersController } from '@/controllers/AgUsersController';

// GET - Get a single user by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const params = await Promise.resolve(context.params);
  return AgUsersController.show(request, { params });
}

// PUT - Update a user
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const params = await Promise.resolve(context.params);
  return AgUsersController.update(request, { params });
}

// DELETE - Delete a user
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const params = await Promise.resolve(context.params);
  return AgUsersController.delete(request, { params });
}
