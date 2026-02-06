import { AgUsersModel } from '@/models/AgUsers';
import { NextRequest, NextResponse } from 'next/server';
import { generateToken, COOKIE_NAME, COOKIE_MAX_AGE } from '@/lib/auth';

export class AuthController {
  /**
   * Login user
   */
  static async login(request: NextRequest) {
    try {
      const body = await request.json();
      const { username, password } = body;

      if (!username || !password) {
        return NextResponse.json(
          { error: 'Username and password are required' },
          { status: 400 }
        );
      }

      // Find user by username
      const user = await AgUsersModel.findByUsername(username);

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid username or password' },
          { status: 401 }
        );
      }

      // Validate password
      const isValidPassword = await AgUsersModel.validatePassword(
        password,
        user.userPassword
      );

      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Invalid username or password' },
          { status: 401 }
        );
      }

      // Generate new token
      const token = generateToken();

      // Update user token and last login
      await AgUsersModel.updateToken(user.userId, token);
      await AgUsersModel.updateLastLogin(user.userId);

      // Get updated user data
      const updatedUser = await AgUsersModel.findById(user.userId);
      if (!updatedUser) {
        return NextResponse.json(
          { error: 'An error occurred during login' },
          { status: 500 }
        );
      }

      // Return user data (excluding password)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { userPassword: _, ...userWithoutPassword } = updatedUser;

      // Create response with user data
      const response = NextResponse.json({
        success: true,
        user: userWithoutPassword,
      });

      // Set auth cookie in response
      response.cookies.set({
        name: COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      });

      return response;
    } catch (error) {
      console.error('Login error:', error);
      return NextResponse.json(
        { error: 'An error occurred during login' },
        { status: 500 }
      );
    }
  }

  /**
   * Register new user
   */
  static async register(request: NextRequest) {
    try {
      const body = await request.json();
      const {
        firstName,
        lastName,
        email,
        password,
        userName,
        userRole,
        countryCode,
      } = body;

      if (
        !firstName ||
        !lastName ||
        !password ||
        !userName ||
        !userRole ||
        !countryCode
      ) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // Check if username already exists
      const usernameExists = await AgUsersModel.usernameExists(userName);

      if (usernameExists) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        );
      }

      // Create user
      const user = await AgUsersModel.create({
        userName,
        firstName,
        lastName,
        userPassword: password,
        userRole: parseInt(userRole),
        emailAddress: email || null,
        countryCode,
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }

      // Return user data (excluding password)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { userPassword: _, ...userWithoutPassword } = user;

      return NextResponse.json(
        {
          success: true,
          user: userWithoutPassword,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Registration error:', error);
      
      // Return more detailed error in development
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during registration';
      const errorDetails = process.env.NODE_ENV === 'development' 
        ? { error: errorMessage, stack: error instanceof Error ? error.stack : undefined }
        : { error: 'An error occurred during registration' };
      
      return NextResponse.json(
        errorDetails,
        { status: 500 }
      );
    }
  }
}

