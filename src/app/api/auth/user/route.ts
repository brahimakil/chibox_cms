import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';
import { AgUsersModel } from '@/models/AgUsers';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      // No token — clear cookie (in case it's stale/corrupt) and return 401
      const response = NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
      response.cookies.set({
        name: COOKIE_NAME,
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
        expires: new Date(0),
      });
      return response;
    }

    // Find user by token
    const user = await AgUsersModel.findByToken(token);

    if (!user || !user.token || user.token.trim() === '') {
      // Invalid token — clear cookie so middleware stops letting them through
      const response = NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
      response.cookies.set({
        name: COOKIE_NAME,
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
        expires: new Date(0),
      });
      return response;
    }

    // Return user data (excluding password)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userPassword: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

