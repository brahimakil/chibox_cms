import { NextRequest } from 'next/server';
import { UserController } from '@/controllers/UserController';

// GET - List all clients (regular users)
export async function GET(request: NextRequest) {
  return UserController.index(request);
}

// POST - Create a new client
export async function POST(request: NextRequest) {
  return UserController.create(request);
}

