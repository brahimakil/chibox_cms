import { NextRequest } from 'next/server';
import { UserController } from '@/controllers/UserController';

// POST - Bulk delete clients
export async function POST(request: NextRequest) {
  return UserController.bulkDelete(request);
}

