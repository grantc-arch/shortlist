/** The key that signs login sessions and unsubscribe links. */
export function authSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set in production");
    return "dev-only-secret-change-me-dev-only-secret";
  }
  return s;
}
