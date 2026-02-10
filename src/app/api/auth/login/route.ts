import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Find user by username or email
    const user = await prisma.ag_users.findFirst({
      where: {
        OR: [
          { user_name: username },
          { email_address: username },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify password (bcrypt)
    const isValid = await verifyPassword(password, user.user_password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create session
    await createSession(user);

    return NextResponse.json({
      success: true,
      user: {
        id: user.user_id,
        username: user.user_name,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email_address,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
