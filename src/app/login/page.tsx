import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-3xl font-bold">Log in</h1>
      <p className="mt-2 text-ink-2">
        New here?{" "}
        <Link className="link" href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}>
          Create an account
        </Link>
      </p>
      <LoginForm next={next} />
    </div>
  );
}
