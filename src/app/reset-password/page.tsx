import type { Metadata } from "next";
import Link from "next/link";
import { findValidResetToken } from "@/lib/password-reset";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false },
  // Keep the token out of the Referer header if the page links anywhere.
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const valid = await findValidResetToken(token);

  return (
    <div className="mx-auto max-w-sm">
      {valid ? (
        <>
          <h1 className="text-3xl font-bold">Choose a new password</h1>
          <p className="mt-2 text-ink-2">You'll be logged in once it's saved, and logged out everywhere else.</p>
          <ResetForm token={token} />
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold">This link doesn't work</h1>
          <p className="mt-2 text-ink-2">
            Reset links work once, for 60 minutes. This one has expired or has already been used.
          </p>
          <Link href="/forgot-password" className="btn btn-primary mt-6">
            Send a new link
          </Link>
        </>
      )}
    </div>
  );
}
