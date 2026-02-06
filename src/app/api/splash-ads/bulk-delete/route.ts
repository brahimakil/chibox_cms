import { NextRequest, NextResponse } from 'next/server';
import { SplashAdModel } from '@/models/SplashAd';

export async function POST(request: NextRequest) {
  try {
    const { ids } = await request.json();
    const result = await SplashAdModel.bulkDelete(ids);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API route error (POST /api/splash-ads/bulk-delete):', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
