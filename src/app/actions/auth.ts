"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { endSession, getSession, hashPassword, startSession, verifyPassword } from "@/lib/auth";
import { parsePlace } from "@/lib/places";

export type FormState = { error?: string } | undefined;

const safeNext = (next: unknown) =>
  typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null;

const signupSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("candidate"),
    email: z.email("Enter a valid email address"),
    password: z.string().min(8, "Use at least 8 characters for your password"),
    fullName: z.string().trim().min(2, "Enter your full name"),
  }),
  z.object({
    role: z.literal("employer"),
    email: z.email("Enter a valid email address"),
    password: z.string().min(8, "Use at least 8 characters for your password"),
    companyName: z.string().trim().min(2, "Enter your company or organisation name"),
  }),
]);

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;
  const location = data.role === "employer" ? parsePlace(form, "city", "Enter where you're based") : null;
  if (location && "error" in location) return { error: location.error };
  const email = data.email.toLowerCase();

  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (existing) return { error: "There's already an account with that email. Log in instead." };

  const [user] = await db
    .insert(schema.users)
    .values({ email, passwordHash: await hashPassword(data.password), role: data.role })
    .returning();

  if (data.role === "candidate") {
    await db.insert(schema.candidates).values({ userId: user.id, fullName: data.fullName });
  } else {
    const { label, lat, lng } = location!.place;
    await db.insert(schema.employers).values({ userId: user.id, companyName: data.companyName, city: label, lat, lng });
  }

  await startSession({ userId: user.id, role: user.role, email });
  redirect(safeNext(form.get("next")) ?? (data.role === "candidate" ? "/candidate/profile?welcome=1" : "/employer"));
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "That email and password don't match an account." };
  }
  await startSession({ userId: user.id, role: user.role, email: user.email });
  redirect(safeNext(form.get("next")) ?? (user.role === "candidate" ? "/candidate" : "/employer"));
}

export async function logout() {
  await endSession();
  redirect("/");
}

/** Permanently deletes the signed-in account and everything attached to it (profile, CV, jobs, applications). */
export async function deleteAccount(form: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (form.get("confirm") !== "on") redirect(session.role === "candidate" ? "/candidate/profile" : "/employer/profile");
  await db.delete(schema.users).where(eq(schema.users.id, session.userId));
  await endSession();
  redirect("/?deleted=1");
}
