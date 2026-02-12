import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";
import { getUserRoleAndPermissions } from "@/lib/rbac";

// POST /api/auth/signup — create a new admin account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_name, first_name, last_name, email_address, password, role_key } = body;

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

    if (user_name.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters" },
        { status: 400 }
      );
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
        user_password: hashedPassword,
        user_role: userRoleInt,
        country_code: "LB",
      },
    });

    // Look up the cms_roles row for this role_key and create the cms_user_roles entry
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

    // Auto-login after signup
    const role = await getUserRoleAndPermissions(user.user_id);
    await createSession(user, role);

    return NextResponse.json(
      {
        success: true,
        user: {
          user_id: user.user_id,
          user_name: user.user_name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}

// GET /api/auth/signup — signup is always available
export async function GET() {
  return NextResponse.json({ signupAvailable: true });
}
