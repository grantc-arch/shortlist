import type { Metadata } from "next";
import Link from "next/link";
import { emailConfigured } from "@/lib/email";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Forgot your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  const canSend = emailConfigured();
  const devMode = process.env.NODE_ENV !== "production";
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-3xl font-bold">Forgot your password?</h1>
      {canSend || devMode ? (
        <>
          <p className="mt-2 text-ink-2">Enter the email you signed up with and we'll send you a link to choose a new one.</p>
          {!canSend && (
            <p className="mt-4 rounded-md bg-sunken px-3 py-2 text-sm text-ink-2">
              Email isn't set up yet, so the reset link is printed in the terminal running <code>npm run dev</code>.
            </p>
          )}
          <ForgotForm />
        </>
      ) : (
        <p className="mt-2 text-ink-2">
          Password reset isn't available on this site yet. If you're stuck, create a new account instead.
        </p>
      )}
      <p className="mt-6 text-sm">
        <Link href="/login" className="link">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
