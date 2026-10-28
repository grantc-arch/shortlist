"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { startSession } from "@/lib/auth";
import { requestPasswordReset, resetPassword } from "@/lib/password-reset";
import type { FormState } from "./auth";

export type ForgotState = { error?: string; sent?: boolean } | undefined;

export async function forgotPassword(_: ForgotState, form: FormData): Promise<ForgotState> {
  const parsed = z.email().safeParse(String(form.get("email") ?? "").trim());
  if (!parsed.success) return { error: "Enter the email address you signed up with." };
  // Look up the account and send the email after responding, so the reply takes the same
  // time whether or not the account exists (otherwise timing would reveal who has one).
  after(async () => {
    try {
      await requestPasswordReset(parsed.data);
    } catch (err) {
      console.error("Password reset email failed:", err);
    }
  });
  return { sent: true };
}

const resetSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Use at least 8 characters for your new password"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "The two passwords don't match" });

export async function completeReset(_: FormState, form: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const user = await resetPassword(parsed.data.token, parsed.data.password);
  if (!user) return { error: "This link has expired or has already been used. Ask for a new one below." };
  await startSession({ userId: user.id, role: user.role, email: user.email });
  redirect(`${user.role === "candidate" ? "/candidate" : "/employer"}?passwordReset=1`);
}
