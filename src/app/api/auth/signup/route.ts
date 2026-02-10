import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";

// POST /api/auth/signup — create a new admin account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_name, first_name, last_name, email_address, password } = body;

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

    const hashedPassword = await hashPassword(password);

    const user = await prisma.ag_users.create({
      data: {
        user_name,
        first_name: first_name || null,
        last_name: last_name || null,
        email_address: email_address || null,
        user_password: hashedPassword,
        user_role: 1, // Super Admin
        country_code: "LB",
      },
    });

    // Auto-login after signup
    await createSession(user);

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
