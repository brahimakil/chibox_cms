import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      userId: session.userId,
      username: session.username,
      email: session.email,
      firstName: session.firstName,
      lastName: session.lastName,
      roleKey: session.roleKey,
      roleName: session.roleName,
      permissions: session.permissions,
    },
  });
}
