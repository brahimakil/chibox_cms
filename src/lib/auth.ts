import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "chihelo-cms-secret-key-change-in-production-2026"
);

const SESSION_DURATION = 3 * 24 * 60 * 60; // 3 days in seconds
const COOKIE_NAME = "cms_session";

export interface SessionPayload {
  userId: number;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  roleKey: string;
  roleName: string;
  permissions: string[];
}

export async function createSession(user: {
  user_id: number;
  user_name: string;
  email_address: string | null;
  first_name: string | null;
  last_name: string | null;
}, role: { roleKey: string; roleName: string; permissions: string[] }) {
  const payload: SessionPayload = {
    userId: user.user_id,
    username: user.user_name,
    email: user.email_address,
    firstName: user.first_name,
    lastName: user.last_name,
    roleKey: role.roleKey,
    roleName: role.roleName,
    permissions: role.permissions,
  };

  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });

  // Update last_login
  await prisma.ag_users.update({
    where: { user_id: user.user_id },
    data: { last_login: new Date() },
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  // PHP bcrypt uses $2y$ prefix, bcryptjs handles it natively
  return bcrypt.compare(plainPassword, hashedPassword);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 13);
}
