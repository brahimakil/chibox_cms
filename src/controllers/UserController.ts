import { NextRequest, NextResponse } from 'next/server';
import { UsersModel } from '@/models/Users';
import { prisma } from '@/lib/db';

export class UserController {
  /**
   * Get all users with optional pagination
   */
  static async index(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams;
      const page = searchParams.get('page');
      const limit = searchParams.get('limit');
      const search = searchParams.get('search') || searchParams.get('q');
      const isActive = searchParams.get('is_active');
      const isActivated = searchParams.get('is_activated');
      const type = searchParams.get('type');
      const sortParams = searchParams.getAll('sort');

      const params: {
        page?: number;
        limit?: number;
        search?: string;
        id?: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        country_code?: string;
        phone_number?: string;
        gender?: string;
        is_active?: number;
        is_activated?: number;
        type?: number;
        sort?: string[];
      } = {};

      params.page = page ? parseInt(page) : 1;
      params.limit = limit ? parseInt(limit) : 50;
      
      if (params.limit > 500) {
        params.limit = 500;
      }

      if (search) {
        params.search = decodeURIComponent(search).trim();
      }

      // Column filters
      const id = searchParams.get('id');
      const firstName = searchParams.get('first_name');
      const lastName = searchParams.get('last_name');
      const email = searchParams.get('email');
      const countryCode = searchParams.get('country_code');
      const phoneNumber = searchParams.get('phone_number');
      const gender = searchParams.get('gender');

      if (id) {
        params.id = id;
      }
      if (firstName) {
        params.first_name = decodeURIComponent(firstName).trim();
      }
      if (lastName) {
        params.last_name = decodeURIComponent(lastName).trim();
      }
      if (email) {
        params.email = decodeURIComponent(email).trim();
      }
      if (countryCode) {
        params.country_code = decodeURIComponent(countryCode).trim();
      }
      if (phoneNumber) {
        params.phone_number = decodeURIComponent(phoneNumber).trim();
      }
      if (gender) {
        params.gender = decodeURIComponent(gender).trim();
      }

      if (isActive !== null && isActive !== undefined) {
        params.is_active = parseInt(isActive);
      }

      if (isActivated !== null && isActivated !== undefined) {
        params.is_activated = parseInt(isActivated);
      }

      if (type !== null && type !== undefined) {
        params.type = parseInt(type);
      }

      if (sortParams.length > 0) {
        params.sort = sortParams;
      }

      const result = await UsersModel.findAll(params);
      return NextResponse.json(result);
    } catch (error) {
      console.error('UserController.index error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch users',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Get single user by ID
   */
  static async show(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const id = parseInt(params.id);
      if (isNaN(id)) {
        return NextResponse.json(
          { success: false, error: 'Invalid user ID' },
          { status: 400 }
        );
      }

      const user = await UsersModel.findByIdWithStats(id);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        user,
      });
    } catch (error) {
      console.error('UserController.show error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch user',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Create a new user
   */
  static async create(request: NextRequest) {
    try {
      const body = await request.json();
      const user = await UsersModel.create(body);
      return NextResponse.json({
        success: true,
        user,
      });
    } catch (error) {
      console.error('UserController.create error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create user',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Update a user
   */
  static async update(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const id = parseInt(params.id);
      if (isNaN(id)) {
        return NextResponse.json(
          { success: false, error: 'Invalid user ID' },
          { status: 400 }
        );
      }

      const body = await request.json();
      
      // Pass raw body to model - filtering happens in UsersModel.update (single source of truth)
      const user = await UsersModel.update(id, body);
      return NextResponse.json({
        success: true,
        user,
      });
    } catch (error) {
      console.error('UserController.update error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update user',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Delete a user
   */
  static async delete(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const id = parseInt(params.id);
      if (isNaN(id)) {
        return NextResponse.json(
          { success: false, error: 'Invalid user ID' },
          { status: 400 }
        );
      }

      await prisma.users.delete({
        where: { id },
      });

      return NextResponse.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      console.error('UserController.delete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete user',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Bulk delete users
   */
  static async bulkDelete(request: NextRequest) {
    try {
      const body = await request.json();
      const { ids } = body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid IDs array' },
          { status: 400 }
        );
      }

      await prisma.users.deleteMany({
        where: {
          id: {
            in: ids.map((id: string | number) => parseInt(String(id))),
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: `${ids.length} user(s) deleted successfully`,
      });
    } catch (error) {
      console.error('UserController.bulkDelete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete users',
        },
        { status: 500 }
      );
    }
  }
}

