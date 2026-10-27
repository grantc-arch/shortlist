import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

const COOKIE = "shortlist_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type Role = "employer" | "candidate";
export interface Session {
  userId: string;
  role: Role;
  email: string;
}

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set in production");
    return new TextEncoder().encode("dev-only-secret-change-me-dev-only-secret");
  }
  return new TextEncoder().encode(s);
}

export const hashPassword = (password: string) => bcrypt.hash(password, 10);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export async function startSession(session: Session) {
  const token = await new SignJWT({ role: session.role, email: session.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || (payload.role !== "employer" && payload.role !== "candidate")) return null;
    // Make sure the account still exists (e.g. after a database reset).
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, payload.sub) });
    if (!user) return null;
    return { userId: user.id, role: user.role, email: user.email };
  } catch {
    return null;
  }
}

/** Use at the top of a page or action that needs a signed-in user of a given role. */
export async function requireRole(role: Role, next?: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  if (session.role !== role) redirect(session.role === "employer" ? "/employer" : "/candidate");
  return session;
}
