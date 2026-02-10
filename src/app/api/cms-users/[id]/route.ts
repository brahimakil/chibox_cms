import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";

// GET /api/cms-users/[id] — get a single CMS user
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = Number.parseInt(id);
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const user = await prisma.ag_users.findUnique({
    where: { user_id: userId },
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
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

// PUT /api/cms-users/[id] — update a CMS user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = Number.parseInt(id);
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
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
    } = body;

    // Check the user exists
    const existing = await prisma.ag_users.findUnique({
      where: { user_id: userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If username changed, check uniqueness
    if (user_name && user_name !== existing.user_name) {
      const nameTaken = await prisma.ag_users.findFirst({
        where: { user_name, NOT: { user_id: userId } },
      });
      if (nameTaken) {
        return NextResponse.json(
          { error: "Username already exists" },
          { status: 409 }
        );
      }
    }

    // If email changed, check uniqueness
    if (email_address && email_address !== existing.email_address) {
      const emailTaken = await prisma.ag_users.findFirst({
        where: { email_address, NOT: { user_id: userId } },
      });
      if (emailTaken) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 409 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updated_by: session.userId,
      updated_at: new Date(),
    };

    if (user_name) updateData.user_name = user_name;
    if (first_name !== undefined) updateData.first_name = first_name || null;
    if (last_name !== undefined) updateData.last_name = last_name || null;
    if (email_address !== undefined)
      updateData.email_address = email_address || null;
    if (phone_number_one !== undefined)
      updateData.phone_number_one = phone_number_one || null;

    // Only hash & update password if provided
    if (password && password.length > 0) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }
      updateData.user_password = await hashPassword(password);
    }

    const user = await prisma.ag_users.update({
      where: { user_id: userId },
      data: updateData,
      select: {
        user_id: true,
        user_name: true,
        first_name: true,
        last_name: true,
        email_address: true,
        phone_number_one: true,
        created_at: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Update CMS user error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/cms-users/[id] — delete a CMS user
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = Number.parseInt(id);
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // Prevent self-deletion
  if (userId === session.userId) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    );
  }

  try {
    await prisma.ag_users.delete({
      where: { user_id: userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete CMS user error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
