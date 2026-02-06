import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';
import { AgUsersModel } from '@/models/AgUsers';

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get(COOKIE_NAME)?.value;

    // If token exists, invalidate it in the database (set to null)
    if (token) {
      try {
        const user = await AgUsersModel.findByToken(token);
        if (user) {
          // Invalidate the token in database
          await AgUsersModel.updateToken(user.userId, '');
        }
      } catch (error) {
        console.error('Error invalidating token:', error);
        // Continue with logout even if token invalidation fails
      }
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Properly delete the cookie by setting expired date
    response.cookies.delete(COOKIE_NAME);

    // Also set it to empty with expired date as backup
    response.cookies.set({
      name: COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
      expires: new Date(0), // Set to epoch time to ensure deletion
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}

