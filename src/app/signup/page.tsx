import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string; as?: string }> }) {
  const { next, as } = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold">Create an account</h1>
      <p className="mt-2 text-ink-2">
        Already have one?{" "}
        <Link className="link" href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>
          Log in
        </Link>
      </p>
      <SignupForm next={next} initialRole={as === "employer" ? "employer" : "candidate"} />
    </div>
  );
}
