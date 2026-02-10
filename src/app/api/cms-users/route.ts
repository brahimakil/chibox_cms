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
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({ users });
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

    const hashedPassword = await hashPassword(password);

    const user = await prisma.ag_users.create({
      data: {
        user_name,
        first_name: first_name || null,
        last_name: last_name || null,
        email_address: email_address || null,
        phone_number_one: phone_number_one || null,
        user_password: hashedPassword,
        user_role: 1, // Admin
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

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Create CMS user error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
