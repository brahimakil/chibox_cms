import { NextRequest, NextResponse } from 'next/server';
import { SplashAdModel } from '@/models/SplashAd';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const params = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      search: searchParams.get('search') || undefined,
      isActive: searchParams.get('isActive') ? parseInt(searchParams.get('isActive')!) : undefined,
      mediaType: searchParams.get('mediaType') || undefined,
      sort: searchParams.get('sort') ? searchParams.get('sort')!.split(',') : undefined,
    };

    const result = await SplashAdModel.findAll(params);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API route error (GET /api/splash-ads):', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await SplashAdModel.create(data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API route error (POST /api/splash-ads):', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
