import { NextRequest } from 'next/server';
import { AuthController } from '@/controllers/AuthController';

export async function POST(request: NextRequest) {
  return AuthController.register(request);
}

