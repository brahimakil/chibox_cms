import { NextRequest } from 'next/server';
import { AgUsersController } from '@/controllers/AgUsersController';

// POST - Bulk delete users
export async function POST(request: NextRequest) {
  return AgUsersController.bulkDelete(request);
}
