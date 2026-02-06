import { NextRequest, NextResponse } from 'next/server';
import { AgUsersModel, CreateAgUserData } from '@/models/AgUsers';

export class AgUsersController {
  /**
   * Get all users with optional pagination
   */
  static async index(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams;
      const page = searchParams.get('page');
      const limit = searchParams.get('limit');
      const search = searchParams.get('search') || searchParams.get('q');
      // Column filters
      const id = searchParams.get('id');
      const userName = searchParams.get('user_name');
      const firstName = searchParams.get('first_name');
      const lastName = searchParams.get('last_name');
      const emailAddress = searchParams.get('email_address');
      const userRole = searchParams.get('user_role');
      const countryCode = searchParams.get('country_code');
      const hasRelatedStore = searchParams.get('has_related_store');
      // Sorting parameters
      const sortParams = searchParams.getAll('sort');

      const params: {
        page?: number;
        limit?: number;
        search?: string;
        id?: string;
        user_name?: string;
        first_name?: string;
        last_name?: string;
        email_address?: string;
        user_role?: number;
        country_code?: string;
        has_related_store?: number;
        sort?: string[];
      } = {};

      if (page) {
        params.page = parseInt(page);
      }
      if (limit) {
        params.limit = parseInt(limit);
      }
      if (search) {
        params.search = decodeURIComponent(search).trim();
      }
      if (id) {
        params.id = id;
      }
      if (userName) {
        params.user_name = userName;
      }
      if (firstName) {
        params.first_name = firstName;
      }
      if (lastName) {
        params.last_name = lastName;
      }
      if (emailAddress) {
        params.email_address = emailAddress;
      }
      if (userRole !== null && userRole !== undefined) {
        params.user_role = parseInt(userRole);
      }
      if (countryCode) {
        params.country_code = countryCode;
      }
      if (hasRelatedStore !== null && hasRelatedStore !== undefined) {
        params.has_related_store = parseInt(hasRelatedStore);
      }
      if (sortParams.length > 0) {
        params.sort = sortParams;
      }

      const result = await AgUsersModel.findAll(params);
      return NextResponse.json(result);
    } catch (error) {
      console.error('AgUsersController.index error:', error);
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
   * Get a single user by ID
   */
  static async show(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const userId = parseInt(params.id);
      if (isNaN(userId)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid user ID',
          },
          { status: 400 }
        );
      }

      const user = await AgUsersModel.findById(userId);
      if (!user) {
        return NextResponse.json(
          {
            success: false,
            error: 'User not found',
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        user,
      });
    } catch (error) {
      console.error('AgUsersController.show error:', error);
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
      
      // Map request body to CreateAgUserData format
      const userData: CreateAgUserData = {
        user_name: body.user_name,
        first_name: body.first_name || null,
        last_name: body.last_name || null,
        user_password: body.user_password,
        user_role: body.user_role,
        email_address: body.email_address || null,
        address: body.address || null,
        phone_number_one: body.phone_number_one || null,
        country_code: body.country_code,
        gender: body.gender || null,
        description: body.description || null,
        birth_date: body.birth_date ? new Date(body.birth_date) : null,
        main_image: body.main_image || null,
        has_related_store: body.has_related_store || 0,
      };

      // TODO: Get createdBy from auth session
      const createdBy = body.created_by || null;

      const user = await AgUsersModel.create(userData, createdBy);

      return NextResponse.json({
        success: true,
        user,
        message: 'User created successfully',
      });
    } catch (error) {
      console.error('AgUsersController.create error:', error);
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
      const userId = parseInt(params.id);
      if (isNaN(userId)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid user ID',
          },
          { status: 400 }
        );
      }

      const body = await request.json();
      
      // Map request body to update format
      const updateData: Partial<CreateAgUserData> = {};
      if (body.user_name !== undefined) updateData.user_name = body.user_name;
      if (body.first_name !== undefined) updateData.first_name = body.first_name;
      if (body.last_name !== undefined) updateData.last_name = body.last_name;
      if (body.user_password !== undefined) updateData.user_password = body.user_password;
      if (body.user_role !== undefined) updateData.user_role = body.user_role;
      if (body.email_address !== undefined) updateData.email_address = body.email_address;
      if (body.address !== undefined) updateData.address = body.address;
      if (body.phone_number_one !== undefined) updateData.phone_number_one = body.phone_number_one;
      if (body.country_code !== undefined) updateData.country_code = body.country_code;
      if (body.gender !== undefined) updateData.gender = body.gender;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.birth_date !== undefined) updateData.birth_date = body.birth_date ? new Date(body.birth_date) : null;
      if (body.main_image !== undefined) updateData.main_image = body.main_image;
      if (body.has_related_store !== undefined) updateData.has_related_store = body.has_related_store;

      // TODO: Get updatedBy from auth session
      const updatedBy = body.updated_by || null;

      const user = await AgUsersModel.update(userId, updateData, updatedBy);

      return NextResponse.json({
        success: true,
        user,
        message: 'User updated successfully',
      });
    } catch (error) {
      console.error('AgUsersController.update error:', error);
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
      const userId = parseInt(params.id);
      if (isNaN(userId)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid user ID',
          },
          { status: 400 }
        );
      }

      await AgUsersModel.delete(userId);

      return NextResponse.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      console.error('AgUsersController.delete error:', error);
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
      const ids = body.ids;

      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid IDs array',
          },
          { status: 400 }
        );
      }

      const userIds = ids.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id));

      if (userIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'No valid user IDs provided',
          },
          { status: 400 }
        );
      }

      await AgUsersModel.bulkDelete(userIds);

      return NextResponse.json({
        success: true,
        message: `${userIds.length} user(s) deleted successfully`,
      });
    } catch (error) {
      console.error('AgUsersController.bulkDelete error:', error);
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

