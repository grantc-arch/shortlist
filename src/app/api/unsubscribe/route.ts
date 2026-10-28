import { turnOffEmails } from "@/lib/preferences";
import { verifyUnsubscribe } from "@/lib/unsubscribe";

/** One-click unsubscribe (RFC 8058): mail apps POST here when someone presses their "Unsubscribe" button. */
export async function POST(request: Request) {
  const params = new URL(request.url).searchParams;
  const link = verifyUnsubscribe({ u: params.get("u"), k: params.get("k"), t: params.get("t") });
  if (!link) return new Response("This unsubscribe link isn't valid.", { status: 400 });
  await turnOffEmails(link.userId, link.kind);
  return new Response("Unsubscribed.");
}

/** Someone opening the link in a browser gets the confirmation page instead. */
export function GET(request: Request) {
  const url = new URL(request.url);
  return Response.redirect(new URL(`/unsubscribe${url.search}`, url), 303);
}
