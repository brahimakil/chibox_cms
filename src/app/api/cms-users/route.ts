import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";

// GET /api/cms-users — list all CMS admin users
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.ag_users.findMany({
    select: {
      user_id: true,
      user_name: true,
      first_name: true,
      last_name: true,
      email_address: true,
      phone_number_one: true,
      user_role: true,
      last_login: true,
      created_at: true,
      gender: true,
      main_image: true,
      cms_user_roles: {
        select: {
          cms_roles: {
            select: {
              id: true,
              role_key: true,
              role_name: true,
            },
          },
        },
        take: 1,
      },
    },
    orderBy: { created_at: "desc" },
  });

  // Flatten the role info for the frontend
  const usersWithRole = users.map((u) => {
    const roleEntry = u.cms_user_roles?.[0]?.cms_roles;
    return {
      ...u,
      cms_user_roles: undefined,
      role_key: roleEntry?.role_key || null,
      role_name: roleEntry?.role_name || null,
      role_id: roleEntry?.id || null,
    };
  });

  // Also return available roles for dropdowns
  const roles = await prisma.cms_roles.findMany({
    select: { id: true, role_key: true, role_name: true },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ users: usersWithRole, roles });
}

// POST /api/cms-users — create a new CMS admin user
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      user_name,
      first_name,
      last_name,
      email_address,
      phone_number_one,
      password,
      country_code,
      role_key,
    } = body;

    if (!user_name || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existing = await prisma.ag_users.findFirst({
      where: { user_name },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }

    // Check if email already exists (if provided)
    if (email_address) {
      const existingEmail = await prisma.ag_users.findFirst({
        where: { email_address },
      });
      if (existingEmail) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 409 }
        );
      }
    }

    // Map role_key to user_role integer
    const roleKeyMap: Record<string, number> = {
      super_admin: 1,
      buyer: 2,
      china_warehouse: 3,
      lebanon_warehouse: 4,
    };
    const selectedRoleKey = role_key && roleKeyMap[role_key] ? role_key : "super_admin";
    const userRoleInt = roleKeyMap[selectedRoleKey];

    const hashedPassword = await hashPassword(password);

    const user = await prisma.ag_users.create({
      data: {
        user_name,
        first_name: first_name || null,
        last_name: last_name || null,
        email_address: email_address || null,
        phone_number_one: phone_number_one || null,
        user_password: hashedPassword,
        user_role: userRoleInt,
        country_code: country_code || "LB",
        created_by: session.userId,
      },
      select: {
        user_id: true,
        user_name: true,
        first_name: true,
        last_name: true,
        email_address: true,
        created_at: true,
      },
    });

    // Create cms_user_roles entry
    const cmsRole = await prisma.cms_roles.findFirst({
      where: { role_key: selectedRoleKey },
    });
    if (cmsRole) {
      await prisma.cms_user_roles.create({
        data: {
          user_id: user.user_id,
          role_id: cmsRole.id,
        },
      });
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Create CMS user error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
