/**
 * Usernames: how people find each other to send messages, e.g. @lerato_m.
 * 3 to 20 characters: lower-case letters, numbers and underscores, starting with a letter or number.
 */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_]{2,19}$/;

// Names that would look official or clash with pages.
const RESERVED = new Set([
  "admin", "administrator", "shortlist", "support", "help", "team", "staff", "moderator", "official",
  "settings", "messages", "jobs", "employer", "candidate", "login", "signup", "api", "null", "undefined",
]);

/** Accepts "@Lerato_M " and returns "lerato_m". */
export function normaliseUsername(input: string): string {
  return input.trim().replace(/^@+/, "").toLowerCase();
}

/** Why a username can't be used, or null if it's fine. */
export function usernameProblem(username: string): string | null {
  if (username.length < 3) return "Use at least 3 characters.";
  if (username.length > 20) return "Use 20 characters or fewer.";
  if (!USERNAME_PATTERN.test(username)) return "Use only lower-case letters, numbers and underscores, starting with a letter or number.";
  if (RESERVED.has(username)) return "That username is reserved. Try another.";
  return null;
}

/** A starting username from someone's name: "Lerato Mokoena" → "lerato_mokoena". */
export function usernameFromName(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 15)
    .replace(/_+$/, "");
  return base.length >= 3 && !RESERVED.has(base) ? base : `${base || "user"}_${Math.floor(1000 + Math.random() * 9000)}`;
}
