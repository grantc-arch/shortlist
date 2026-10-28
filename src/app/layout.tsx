import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { logout } from "./actions/auth";
import { siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Shortlist", template: "%s | Shortlist" },
  description: "Jobs scored against your profile before you apply, and applicants ranked for employers.",
  // Proves to Google Search Console that you own the site (see README).
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en-ZA">
      <body className="min-h-dvh antialiased">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <Wordmark />
              Shortlist
            </Link>
            <nav className="order-last flex w-full flex-wrap items-center gap-x-5 gap-y-1 text-sm font-medium text-ink-2 sm:order-none sm:w-auto sm:flex-1">
              <Link href="/jobs" className="hover:text-ink">
                Jobs
              </Link>
              {session?.role === "candidate" && (
                <>
                  <Link href="/candidate" className="hover:text-ink">
                    My applications
                  </Link>
                  <Link href="/candidate/profile" className="hover:text-ink">
                    Profile
                  </Link>
                </>
              )}
              {session?.role === "employer" && (
                <>
                  <Link href="/employer" className="hover:text-ink">
                    Dashboard
                  </Link>
                  <Link href="/employer/jobs/new" className="hover:text-ink">
                    Post a job
                  </Link>
                </>
              )}
            </nav>
            <div className="ml-auto flex items-center gap-3 text-sm sm:ml-0">
              {session ? (
                <>
                  <span className="hidden text-muted sm:inline">{session.email}</span>
                  <form action={logout}>
                    <button className="btn py-1.5">Log out</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="font-medium text-ink-2 hover:text-ink">
                    Log in
                  </Link>
                  <Link href="/signup" className="btn btn-primary py-1.5">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 text-sm text-muted sm:px-6">
          Built by Grant Cox. Applicant details are only shared with the employer you apply to.
        </footer>
      </body>
    </html>
  );
}

/** Five ascending bars, the same five criteria colours used in every score. */
function Wordmark() {
  const keys = ["qualification", "experience", "skills", "location", "availability"];
  return (
    <span aria-hidden className="flex h-5 items-end gap-[2px]">
      {keys.map((k, i) => (
        <span key={k} className="w-[4px] rounded-[1px]" style={{ height: `${40 + i * 15}%`, background: `var(--fit-${k})` }} />
      ))}
    </span>
  );
}
