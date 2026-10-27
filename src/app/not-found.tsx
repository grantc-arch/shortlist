import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-ink-2">The job may have closed, or the link is wrong.</p>
      <Link href="/jobs" className="btn btn-primary mt-6">
        Browse open jobs
      </Link>
    </div>
  );
}
