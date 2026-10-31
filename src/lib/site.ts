/**
 * Site-wide settings read from environment variables.
 */

/** The public address of the site, used in links that leave it (sitemap, Google, share previews). */
export function siteUrl(): string {
  const explicit = process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  // Set automatically by Vercel to the project's production domain.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/**
 * Whether open jobs are offered to Google for Jobs. Off unless LIST_JOBS_ON_GOOGLE=true,
 * because Google doesn't allow fake or test postings, and anyone can sign up and post one.
 */
export function googleJobsEnabled(): boolean {
  return process.env.LIST_JOBS_ON_GOOGLE === "true";
}

/** Accounts allowed to review reported jobs, from ADMIN_EMAILS (comma-separated). */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const isAdmin = (email: string | null | undefined) => !!email && adminEmails().includes(email.toLowerCase());

/** Where people write about privacy or the terms: CONTACT_EMAIL, else the first admin, else the address emails come from. */
export function contactEmail(): string | null {
  return process.env.CONTACT_EMAIL?.trim() || adminEmails()[0] || process.env.SMTP_USER?.trim() || null;
}
