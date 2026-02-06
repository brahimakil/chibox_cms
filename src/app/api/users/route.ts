import { NextRequest } from 'next/server';
import { AgUsersController } from '@/controllers/AgUsersController';

// GET - List all users
export async function GET(request: NextRequest) {
  return AgUsersController.index(request);
}

// POST - Create a new user
export async function POST(request: NextRequest) {
  return AgUsersController.create(request);
}
