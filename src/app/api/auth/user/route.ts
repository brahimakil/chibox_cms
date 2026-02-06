import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';
import { AgUsersModel } from '@/models/AgUsers';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      // return NextResponse.redirect(new URL('/login', request.url));
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Find user by token
    const user = await AgUsersModel.findByToken(token);

    if (!user || !user.token || user.token.trim() === '') {
      // return NextResponse.redirect(new URL('/login', request.url));
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
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

